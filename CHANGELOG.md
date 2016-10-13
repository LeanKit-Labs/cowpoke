## 2.x

### 2.1.0

* adding travis configuration

### 2.0.0

This is a major release that affects both Rancher environments as well as
authorizing deployments of stacks to accross environments.

The majority of the work in this release was implemented in #75

* environment meta-data (access keys, slack channels, etc) are no longer stored in an internal database
* environment API endpoints were removed
* environment authorization is now handled by Rancher account tokens instead of environment specific tokens
* variables previously store in the environment database are now handled through environment variables
* slack notification are no longer specific to a particular environment
* small improvements and bug fixes

### 1.x

### 1.7.0

* Removed service API resource
* Added catalog  API resource
* Added catalog upraged functionality
* Various bug fixes and improvements

## 0.x

### 0.6.0

* Updated documentation
* Using updated version of dockerhub api when validating image tags
