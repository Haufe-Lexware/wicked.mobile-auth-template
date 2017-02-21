'use strict';

const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const debug = require('debug')('mobile-auth-server:app');
const wicked = require('wicked-sdk');

const app = express();

app.initApp = function (callback) {

    const BASE_URL = app.get('base_path');

    if (!wicked.isDevelopmentMode()) {
        app.set('trust proxy', 1);
        //sessionArgs.cookie.secure = true;
        console.log("Running in PRODUCTION MODE.");
    } else {
        console.log("=============================");
        console.log(" Running in DEVELOPMENT MODE");
        console.log("=============================");
    }

    app.use(wicked.correlationIdHandler());

    app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));

    app.post(BASE_URL + '/:apiId/token', function (req, res, next) {
        const apiId = req.params.apiId;
        const grantType = req.body.grant_type;

        if ("password" === grantType) {
            handlePasswordToken(apiId, req, res, next);
        } else if ("refresh_token" === grantType) {
            handleRefreshToken(apiId, req, res, next);
        } else {
            const err = new Error('unsupported grant_type');
            err.status = 400;
            next(err);
        }
    });

    function createError(statusCode, message) {
        const err = new Error(message);
        err.status = statusCode;
        return err;
    }

    function handlePasswordToken(apiId, req, res, next) {
        const clientId = req.body.client_id;
        const username = req.body.username;
        const password = req.body.password;
        const scope = req.body.scope;

        if (!username)
            return next(createError(400, 'username is missing'));
        if (!password)
            return next(createError(400, 'password is missing'));
        if (!clientId)
            return next(createError(400, 'client_id is missing'));

        // Check whether we know this clientId with this API id
        // (whether there exists a subscription)
        wicked.getSubscriptionByClientId(clientId, apiId, function (err, subsInfo) {
            if (err) {
                debug('getSubscriptionByClientId failed.');
                debug(err);
                return next(err);
            }

            // TODO: Verify username and password with your Identity Provider
            // This has to be done via a REST call over a secure backend
            // connection. Right now we just assume it's okay, and take these
            // sample values to continue with:
            const profile = {
                username: username,
                userId: '123456',
                email: 'testuser@test.com',
                fullName: 'Test User',
                scope: scope
            };

            // IMPORTANT: Here with just pass in the requested scope to the
            // API Gateway; you will have to decide on the scopes in a second
            // step, the "Authorization Step". In case the authentication is
            // equal to being authorized, leave out the scope altogether.
            // TODO: Authorization.

            // Off we go, this will probably work
            let oauthScope = null;
            if (scope)
                oauthScope = scope.split(' ');
            const userInfo = {
                client_id: clientId,
                api_id: apiId,
                authenticated_userid: profile.userId,
                auth_server: app.get('server_name'),
                scope: oauthScope
            };
            wicked.oauth2GetAccessTokenPasswordGrant(userInfo, function (err, tokenInfo) {
                if (err) {
                    debug('Getting access token from Kong Adapter failed.');
                    debug(err);
                    return next(err);
                }

                // Success, return the token(s)
                res.json(tokenInfo);
            });
        });
    }

    function handleRefreshToken(apiId, req, res, next) {
        const refreshToken = req.body.refresh_token;
        const clientId = req.body.client_id;
        //const scope = req.body.scope;

        wicked.oauth2GetRefreshTokenInfo(refreshToken, function (err, tokenInfo) {
            if (err) {
                debug('Getting info on refresh token from kong failed.');
                debug(err);
                return next(err);
            }
            // TODO: Verify that this user is still valid; the tokenInfo looks like this:
            /*
            {
                "authenticated_userid": "237982738273",
                "authenticated_scope": ["scope1", "scope2"],
                "access_token": "euro4598475983475984798584",
                "refresh_token": "3048983094830958098r090tre098t0947touoi5454"
            }
            */
            // Use the authenticated_userid to check back with your backend that
            // it's actually okay to refresh the token.

            // For now, we'll just do it.

            const payload = {
                client_id: clientId,
                refresh_token: refreshToken,
                auth_server: app.get('server_name'),
                api_id: apiId
            };
            wicked.oauth2RefreshAccessToken(payload, function (err, newToken) {
                if (err) {
                    debug('Getting refreshed token from Kong failed.');
                    debug(err);
                    return next(err);
                }

                res.json(newToken);
            });
        });
    }

    // catch 404 and forward to error handler
    app.use(function (req, res, next) {
        const err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    // error handlers

    // production error handler
    // no stacktraces leaked to user
    app.use(function (err, req, res, next) {
        const status = err.status || 500;
        res.status(status);
        res.json({
            code: status,
            message: err.message,
            error: {}
        });
    });

    callback(null);
};

module.exports = app;
