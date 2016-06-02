# 0.3.0
* implementing endpoint to get a single environment

# 0.2.0
* validate docker image name format during upgrade calls
* validate slack environment variables
* short circuit slack connections once errors occur

# 0.1.1
* Initial checkin
* Add slack integration to notify channels per environment when service upgrades start
* Added validation to stop the creation of empty environments
* Fixed error with multiple copies of a service in different stacks, added optional authorization
* Made sure that the express in memory session’s are not being used
