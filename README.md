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
