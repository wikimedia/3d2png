# 3d2png

Simple thumbnail generator for AMF and STL files. It tries to pick a reasonable
camera position based on the bounding box of the geometry.

## Building and testing with Blubber

`.pipeline/blubber.yaml` gives you a container that matches how this code
runs in production via Thumbor.
Building the container requires Docker with BuildKit

There are two variants:

- `test` runs the test suite, same as `npm test`.
- `dev` runs 3d2png itself, for converting a file by hand.

To run the tests:

    $ docker build -f .pipeline/blubber.yaml --target test -t 3d2png-test .
    $ docker run --rm 3d2png-test

To convert a model file, mount the current directory into the container so
it can read your input file and write the output PNG back out:

    $ docker build -f .pipeline/blubber.yaml --target dev -t 3d2png-dev .
    $ docker run --rm -v "$(pwd):/data" 3d2png-dev /data/samples/Half_Torus.stl 320x240 /data/thumbnail.png

## Development environment

```sh
# Build the image
docker build -f Dockerfile-dev -t 3d2png .

# Convert a file: <model> is the path to the file, <WxH> is the output dimensions (e.g. 640x480), <output.png> is the output path
docker run --init --rm -v .:/app 3d2png <model> <WxH> <output.png>
# e.g.
docker run --init --rm -v .:/app 3d2png /app/samples/Half_Torus.stl 640x480 /app/samples/output.png

# Run tests
docker run --init --rm 3d2png test
```

### MediaWiki-Docker

MediaWiki supports thumbnail generation through 3d2png via
`$wg3dProcessor`, but calling out to this script - which requires
a bunch of dependencies that may conflict with the setup MediaWiki
is running under - may be tricky.

Below is an example of how things can be setup with
[MediaWiki-Docker](https://www.mediawiki.org/wiki/MediaWiki-Docker),
which, in a nutshell, boils down to:
- Building up a 3d2png service container
- Install Docker within the MediaWiki container & give it access to the host sock
- Share volumes where images are read from/written to between both container as well as the web service

In short: make the changes below.

**docker-compose.override.yml**

```yml
volumes:
  mediawiki-images:
  mediawiki-tmp:

x-mediawiki-images-volume: &mediawiki-images-volume
  type: volume
  source: mediawiki-images
  target: /var/www/html/w/images

x-mediawiki-tmp-volume: &mediawiki-tmp-volume
  type: volume
  source: mediawiki-tmp
  target: /tmp

services:
  mediawiki:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - <<: *mediawiki-images-volume
      - <<: *mediawiki-tmp-volume
    post_start:
      - command: >
          sh -c "
            chmod 0666 /var/run/docker.sock &&
            chmod -R 0755 /var/www/html/w/images &&
            apt-get update &&
            apt install -y ca-certificates curl &&
            install -m 0755 -d /etc/apt/keyrings &&
            curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc &&
            chmod a+r /etc/apt/keyrings/docker.asc &&
            echo 'Types: deb\\nURIs: https://download.docker.com/linux/debian\\nSuites: '$(. /etc/os-release && echo "$$VERSION_CODENAME")'\\nComponents: stable\\nSigned-By: /etc/apt/keyrings/docker.asc' >> /etc/apt/sources.list.d/docker.sources &&
            apt update &&
            apt install -y docker-ce docker-ce-cli containerd.io
          "
        user: root
  mediawiki-web:
    volumes:
      - <<: *mediawiki-images-volume
  3d2png:
    build:
      context: /path/to/this.repository
      dockerfile: Dockerfile-dev
    user: "${MW_DOCKER_UID}:${MW_DOCKER_GID}"
    volumes:
      - <<: *mediawiki-images-volume
      - <<: *mediawiki-tmp-volume
```

**LocalSettings.php**

```php
$wg3dProcessor = [
	'docker',
	'exec',
	'mediawiki-3d2png-1',
	'xvfb-run',
	'-a',
	'-s',
	'-ac -screen 0 1280x1024x24',
	'/app/3d2png.js'
];
```
