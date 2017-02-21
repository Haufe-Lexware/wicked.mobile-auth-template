# Mobile API Gateway - Sample Authorization Server

This project is intended as a stub for implementing your own OAuth 2.0 Resource Owner Password Grant enabled Authorization Server, e.g. for a Mobile API Gateway Scenario with [wicked.haufe.io](https://github.com/Haufe-Lexware/wicked.haufe.io).

## How to use

### Step 1 - Build Authorization Server

Use the `Dockerfile` to build the docker image of the Authorization Server; if needed for your setup, push it to your docker registry so that you can access it when deploying:

```bash
$ # possibly log in to your registry
$ docker build -t yourlabel:tag .
$ docker push yourlabel:tag
```

### Step 2 - Add Authorization Server to Deployment

Add the Authorization Server container to your wicked deployment. How this is done depends on your orchestration runtime; make sure that you can reach the authorization server as `http://auth-server:3010` from inside your docker orchestration, either by declaring the auth server as a service in a `docker-compose` file, or by doing the corresponding actions e.g. in a Kubernetes Cluster (or Mesos).

### Step 3 - Register the Authorization Server in your static configuration

Use the wicked "Kickstarter" to add the Authorization Server to your configuration; this will create an "API" for the authorization server so that it can be reached via the API Gateway URL (e.g. `https://api.yourcompany.com/auth-server/...`).

### Step 4 - Enable the Resource Owner Password Grant on your API

Also using the kickstarter, enable the Resource Owner Password Grant on your API (authentication type must be OAuth 2.0, and the `Resource Owner Password Grant` checkbox must be checked), and **associate the API with the Authorization Server**. If you don't do that, the Authorization Server will not be able to issue tokens for the API.

Now you are ready to redeploy everything again, and the Authorization Server will be able to issue access and refresh tokens for the API.

### Step 5 - Use the endpoints in your mobile app

You will now be able to register applications in the API Portal and subscribe to the API; this will give you client credentials (client id and secret) which can be used to get tokens from the Authorization Server. This command line shows what has to be done, here assuming that the API you need access tokens for has the ID `mobile`

```bash
$ curl [--insecure] -X POST -d 'grant_type=password&username=someuser&password=somepassword&client_id=<client id from portal>' https://api.yourcompany.com/auth-server/mobile/token
{"access_token":"acbafe723fdbad879236723bd187ef19b","refresh_token":"ba826df129afde91fabcefa9239012","expires_in":"3600"}
$
```

The corresponding call to refresh a token is:

```bash
$ curl [--insecure] -X POST -d 'grant_type=refresh_token&username=someuser&password=somepassword&client_id=<client id from portal>' https://api.yourcompany.com/auth-server/mobile/token
{"access_token":"ba826df129afde91fabcefa9239012","refresh_token":"acbafe723fdbad879236723bd187ef19b","expires_in":"3600"}
$
```

**Please note** that this stub implementation will **not** try to validate the username and password; as long as both values are present, it will accept them. See below on how to adapt the code for your means.

## How to adapt

Out of the box, this project will build and run and even issue tokens, but will not do any type of authentication or authorization check.

In the code, you will find a couple of `TODO` comments:

* You need to validate the username and password using some headless mechanism (REST call or something similar); this is entirely up to you to do and must integrate into your systems.
* You need to decide whether the authenticated user is allowed (== **authorized**) to access the API, and decide (optionally) on the scope for the access token
* When refreshing the access token, decide whether you want to allow the token being refreshed, based on the content of the access token record in the database

### Parametrizations

The following parameters can be passed into the node process to tweak its behaviour:

Env variable | Default | Description
-------------|---------|------------
`AUTH_SERVER_NAME` | `mobile-auth` | The ID of the authorization server when registered in the static APIm configuration (name of the `.json` file in the `auth-servers` directory)
`AUTH_SERVER_BASEPATH` | `/auth-server` | The base path to serve from; has to match the name in the auth server configuration
