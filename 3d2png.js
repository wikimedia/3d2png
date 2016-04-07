#!/usr/bin/env node

var yargs = require( 'yargs' ).argv,
	fs = require( 'fs' ),
	loader;

if ( yargs._.length < 3 ) {
	throw 'Usage: 3drender <model> <dimensions> <output.png>';
}

var dimensions = yargs._[1].split( 'x' );

var width = parseInt( dimensions[0] ),
	height = parseInt( dimensions[1] ),
	gl = require( 'gl' )( width, height, { preserveDrawingBuffer: true } );

if ( isNaN( width ) || isNaN( height ) ) {
	throw 'Incorrect dimension format, should look like: 640x480';
}

GLOBAL.THREE = require( 'three' );

var outputToObject = function ( output ) {
	return output;
};

if ( yargs._[0].toLowerCase().endsWith( '.amf' ) ) {
	var AMFLoader = require( './AMFLoader' ),
		textEncoding = require( 'text-encoding' );

	GLOBAL.TextEncoder = textEncoding.TextEncoder;
	GLOBAL.TextDecoder = textEncoding.TextDecoder;
	GLOBAL.DOMParser = require( 'xmldom' ).DOMParser;

	loader = new THREE.AMFLoader();
} else if ( yargs._[0].toLowerCase().endsWith( '.stl' ) ) {
	var STLLoader = require( './node_modules/three/examples/js/loaders/STLLoader' );
	loader = new THREE.STLLoader();
	outputToObject = function ( output ) {
		var material = new THREE.MeshPhongMaterial( { color: 0xaaaaff, shading: THREE.FlatShading } ),
			mesh = new THREE.Mesh( output, material );

		return mesh;
	};
} else {
	throw 'Unexpected model file extension, only amf and stl are supported';
}

var Canvas = require( 'canvas' ),
	canvas = new Canvas( width, height ),
	scene = new THREE.Scene(),
	ambient = new THREE.AmbientLight( 0x999999 );

scene.add( ambient );

var camera = new THREE.PerspectiveCamera( 60, width / height, 1, 5000 );
camera.up.set( 0, 0, 1 );
camera.add( new THREE.PointLight( 0xffffff, 0.4 ) );
scene.add( camera );

var grid = new THREE.GridHelper( 25, 1.0 );
grid.setColors( 0xffffff, 0x555555 );
grid.rotateOnAxis( new THREE.Vector3( 1, 0, 0 ), 90 * ( Math.PI/180 ) );

var renderer = new THREE.WebGLRenderer( { canvas: canvas, context: gl, antialias: true, preserveDrawingBuffer: true } );
renderer.setSize( width, height, false );

function center( object ) {
	if ( object.type == 'Group' ) {
		center( object.children[0] );
	} else if ( object.type == 'Mesh' ) {
		object.geometry.center();
		object.geometry.computeBoundingBox();
		bbox = object.geometry.boundingBox;

		bbox_width = bbox.max.x - bbox.min.x;
		bbox_height = bbox.max.z - bbox.min.z;
		bbox_depth = bbox.max.y - bbox.min.y;

		camerax = -bbox_width;
		cameray = -bbox_depth;
		cameraz = bbox_height;

		camera.position.set( camerax, cameray, cameraz );
	}
}

fs.readFile( yargs._[ 0 ], function ( err, data ) {
	if ( err ) {
		throw err;
	}

	var arrayBuffer = new Uint8Array( data ).buffer;

	output = loader.parse( arrayBuffer );

	object = outputToObject( output );

	center( object );

	scene.add( object );

	camera.lookAt( scene.position );
	renderer.render( scene, camera );

	var pixels = new Uint8Array( width * height * 4 );
	gl.readPixels( 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels );

	// Create new canvas because somehow the gl context is getting the rendering but not the canvas passed earlier
	var output_canvas = new Canvas( width, height );
	ctx = output_canvas.getContext( '2d' );
	imgData = ctx.createImageData( width, height );
	imgData.data.set( pixels );
	ctx.putImageData( imgData, 0, 0 );

	var rotated_canvas = new Canvas( width, height );
	rotated_ctx = rotated_canvas.getContext( '2d' );
	rotated_ctx.scale( 1,-1 );
	rotated_ctx.translate( 0, -height );
	rotated_ctx.drawImage( output_canvas, 0, 0 );

	out = fs.createWriteStream( yargs._[2] );
	stream = rotated_canvas.pngStream();

	stream.on('data', function( chunk ) {
		out.write( chunk );
	});
});