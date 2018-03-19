#!/usr/bin/env node

var Canvas = require( 'canvas' ),
	THREE = require( 'three' ),
	GL = require( 'gl' ),
	fs = require( 'fs' ),
	yargs = require( 'yargs' ),
	STLLoader = require( './three-stl-loader.js' )( THREE ),
	polyfills = require( './polyfills.js' );

for (item in polyfills) {
	global[item] = polyfills[item];
}

/**
 * Converts 3D files to PNG images
 * @constructor
 */
function ThreeDtoPNG( width, height ) {
	this.width = width;
	this.height = height;
	// Create a WebGL context and ask it to keep its rendering buffer
	this.gl = GL( this.width, this.height, { preserveDrawingBuffer: true } );
	if ( !this.gl ) {
		throw new Error( 'Unable to initialize WebGL' );
	}
	this.canvas = new Canvas( this.width, this.height );
	this.camera = new THREE.PerspectiveCamera( 60, this.width / this.height, 0.001, 500000 );
	this.renderer = new THREE.WebGLRenderer( { canvas: this.canvas, context: this.gl, antialias: true, preserveDrawingBuffer: true } );
	this.scene = new THREE.Scene();
}

/**
 * Sets up the Three environment (ambient light, camera, renderer)
 */
ThreeDtoPNG.prototype.setupEnvironment = function() {
	var light;

	this.renderer.setClearColor( 0x222222 );
	this.renderer.setSize( this.width, this.height, false );
	this.renderer.shadowMap.enabled = true;

	this.camera.up.set( 0, 0, 1 );
	this.camera.add( new THREE.PointLight( 0xffffff, 0.3 ) );

	this.scene.add( new THREE.AmbientLight( 0x666666, 0.5 ) );
	this.scene.add( this.camera );

	light = new THREE.SpotLight( 0x999999, 1 );
	light.position.set( -100, 50, 25 );
	light.castShadow = true;
	light.shadow.mapSize.width = 4096;
	light.shadow.mapSize.height = 4096;
	this.camera.add( light );

	this.render();
};

/**
 * Converts geometry into a mesh with a default material
 * @param {THREE.BufferGeometry} geometry
 * @returns {THREE.Mesh} mesh
 */
ThreeDtoPNG.prototype.outputToObject = function ( geometry ) {
	var material = new THREE.MeshPhongMaterial( { color: 0xf0ebe8, shininess: 5, flatShading: true, side: THREE.DoubleSide } );

	return new THREE.Mesh( geometry, material );
};

/**
 * Returns the appropriate file loader for a given file
 * @param {string} filePath Full path to the file
 * @returns {THREE.Loader} File loader
 */
ThreeDtoPNG.prototype.getLoader = function() {
	// TODO XXX if more file formats are supported later, need a command line option
	// to signify the expected format of the input file.
	return new STLLoader();
};

/**
 * Positions the camera relative to an object, at an angle
 * @param {THREE.Group|THREE.Mesh} object
 */
ThreeDtoPNG.prototype.center = function( object ) {
	var radius;

	if ( object.type == 'Group' ) {
		this.center( object.children[ 0 ] );
	} else if ( object.type == 'Mesh' ) {
		object.geometry.center();
		object.geometry.computeBoundingSphere();

		radius = object.geometry.boundingSphere.radius;

		// `radius` is the edge of the object's sphere
		// We want to position our camera outside of that sphere.
		// We'll move `radius` (or more) in all directions (x, y, z), so that we're
		// looking at the object somewhat diagonally, which should always show something
		// useful (instead of possibly an uninteresting side or top...)
		// The exact position of the camera was arbitrarily decided by what looked
		// alright-ish for a few files I was testing with.
		// sketchfab.com has this at ( 0, -distance, 0 )
		// viewstl.com has this at ( 0, 0 distance )
		// openjscad.org has this at ( 0, -distance, distance )
		// thingiverse.com has this at ( -distance, -distance, distance )
		this.camera.position.set( -radius * 1.5, -radius * 1.5, radius );
	}
};

/**
 * Adds raw 3D data to the scene
 * @param {THREE.Loader} loader Data loader to use
 * @param {Buffer} data Raw 3D data
 */
ThreeDtoPNG.prototype.addDataToScene = function( loader, data ) {
	// Convert the input data into an array buffer
	var arrayBuffer = new Uint8Array( data ).buffer,
		// Parse the contents of the input buffer
		output = loader.parse( arrayBuffer ),
		// Convert what the loader returns into an object we can add to the scene
		object = this.outputToObject( output );

	object.castShadow = true;
	object.receiveShadow = true;

	// Position the camera relative to the object
	// This allows us to look at the object from enough distance and from
	// an angle
	this.center( object );

	// Add the object to the scene
	this.scene.add( object );

	// Point camera at the scene
	this.camera.lookAt( this.scene.position );
};

/**
 * Renders the scene
 */
ThreeDtoPNG.prototype.render = function() {
	this.renderer.render( this.scene, this.camera );
};

/**
 * Returns a stream to the render canvas
 * @returns {PNGStream} PNG image stream
 */
ThreeDtoPNG.prototype.getCanvasStream = function() {
	// Prepate a buffer for the rendering image data
	var pixels = new Uint8Array( this.width * this.height * 4 ),
		outputCanvas = new Canvas( this.width, this.height ),
		ctx;

	// Read the pixels from the WebGL buffer into our local buffer
	this.gl.readPixels( 0, 0, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels );

	// Create new canvas because somehow the gl context is getting the
	// rendering but not the canvas passed earlier
	ctx = outputCanvas.getContext( '2d' );
	imgData = ctx.createImageData( this.width, this.height );
	imgData.data.set( pixels );
	ctx.putImageData( imgData, 0, 0 );

	// gl.readPixels starts reading left-bottom instead of left-top,
	// so everything will be flipped & we need to un-flip the image
	outputCanvas = this.flip( outputCanvas );

	// Open a read stream from the canvas
	return outputCanvas.pngStream();
};

/**
 * Flips canvas over Y axis
 * @param {Canvas} canvas
 * @returns {Canvas}
 */
ThreeDtoPNG.prototype.flip = function( canvas ) {
	var flipped = new Canvas( this.width, this.height ),
		ctx = flipped.getContext( '2d' );

	ctx.globalCompositeOperation = 'copy';
	ctx.scale( 1, -1 );
	ctx.translate( 0, -imgData.height );
	ctx.drawImage( canvas, 0, 0 );
	ctx.setTransform( 1, 0, 0, 1, 0, 0 );
	ctx.globalCompositeOperation = 'source-over';

	return ctx.canvas;
};

/**
 * Converts a 3D model file into a PNG image
 * @param {string} sourcePath Full path to the source 3D model file
 * @param {string} destinationPath Full path to the destination PNG file
 * @param {Function} callback Called when conversion is complete
 */
ThreeDtoPNG.prototype.convert = function( sourcePath, destinationPath, callback ) {
	var loader = this.getLoader( sourcePath ),
		self = this;

	fs.readFile( sourcePath, function ( err, data ) {
		if ( err ) {
			throw err;
		}

		self.addDataToScene( loader, data );
		self.render();

		stream = self.getCanvasStream();

		// Open a write stream to the destination output file
		out = fs.createWriteStream( destinationPath );

		// Stream the contents of the canvas into the output stream
		stream.on( 'data', function( chunk ) {
			out.write( chunk );
		} );

		stream.on( 'end', function() {
			// Reset the scene for future conversions.
			self.scene = new THREE.Scene();

			// Close the output stream.
			out.end( function() {
				if ( callback ) {
					callback();
				}
			});
		} );
	} );
};

exports.ThreeDtoPNG = ThreeDtoPNG;

if ( require.main === module ) {
	var args = yargs.argv;

	if ( args._.length < 3 ) {
		throw 'Usage: 3drender <model> <dimensions> <output.png>';
	}

	var	dimensions = args._[ 1 ].split( 'x' ),
		width = parseInt( dimensions[0] ),
		height = parseInt( dimensions[1] );

	if ( isNaN( width ) || isNaN( height ) ) {
		throw 'Incorrect dimension format, should look like: 640x480';
	}

	var t = new ThreeDtoPNG( width, height );

	t.setupEnvironment();
	t.convert( args._[ 0 ], args._[2] );
}
