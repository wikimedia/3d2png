# 3d2png

Simple thumbnail generator for AMF and STL files. It tries to pick a reasonable
camera position based on the bounding box of the geometry.

## How to build 3d2png-deploy

The deploy repository needs to be built on a system as similar to the
production hosts as possible. For this reason, we use the service-runner
package, which spins up a Docker container based on the definition
provided in the `deploy` stanza of package.json, installs the
distribution packages needed, builds the node_modules directory and
updates the source repo submodule.

To that end, this commit adds the deployment definition to package.json
and service-runner as a development dependency (which means it will not
get installed into the deploy repository). There is also a minimal
config.yaml file that is needed by service-runner in order to build the
deploy repository.

Note that in order for the build process to work you need Docker set up
on the machine, as well as configure git to point to the location of the
deploy repository:

    $ git config deploy.dir /full/path/to/deploy/repo

The build process can then be initiated with

    $ npm run build-deploy
