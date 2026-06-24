import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import msssim from 'image-ms-ssim';
import pngjs from 'pngjs';
import { v4 as uuidv4 } from 'uuid';
import { ThreeDtoPNG } from './3d2png.js';

const { PNG } = pngjs;

describe( 'STL', function() {
	const filename = uuidv4() + '.png',
		images = [];

	function loaded( img, callback ) {
		images.push( img );

		if ( images.length === 2 ) {
			callback( images );
		}
	}

	function loadPNG( filePath, callback ) {
		fs.createReadStream( filePath )
		.pipe( new PNG() )
		.on( 'parsed', function () {
			loaded( {
				data: this.data,
				width: this.width,
				height: this.height,
				channels: 4
			}, callback);
		} );
	}

	function loadImages( file1, file2, callback ) {
		loadPNG( file1, callback );
		loadPNG( file2, callback );
	}

	after( function() {
		fs.unlinkSync( './' + filename );
	} );

	it( 'Converts to PNG correctly', function( done ) {
		this.timeout( 10000 );

		const t = new ThreeDtoPNG( 640, 480 );

		function conversionDone() {
			loadImages( './' + filename, './samples/DavidStatue.png', function( images ) {
				const score = msssim.compare( images[0], images[1] );

				assert( score.msssim > 0.99, 'MS-SSIM below threshold (David)' );
				assert( score.ssim > 0.99, 'SSIM below threshold (David)' );

				images.splice(0);
				done();
			} );
		}

		t.setupEnvironment();
		t.convert( './samples/DavidStatue.stl', './' + filename, conversionDone );
	} );

	it( 'Converts to PNG correctly with reversed faces', function( done ) {
		this.timeout( 10000 );

		const t = new ThreeDtoPNG( 640, 480 );

		function conversionDone() {
			loadImages( './' + filename, './samples/Half_Torus.png', function( images ) {
				const score = msssim.compare( images[0], images[1] );

				assert( score.msssim > 0.99, 'MS-SSIM below threshold (Torus)' );
				assert( score.ssim > 0.99, 'SSIM below threshold (Torus)' );

				images.splice(0);
				done();
			} );
		}

		t.setupEnvironment();
		t.convert( './samples/Half_Torus.stl', './' + filename, conversionDone );
	} );


	it( 'Converts to PNG correctly with close-up model', function( done ) {
		this.timeout( 10000 );

		const t = new ThreeDtoPNG( 640, 480 );

		function conversionDone() {
			loadImages( './' + filename, './samples/High_quality_skull.png', function( images ) {
				const score = msssim.compare( images[0], images[1] );

				assert( score.msssim > 0.99, 'MS-SSIM below threshold (Skull)' );
				assert( score.ssim > 0.99, 'SSIM below threshold (Skull)' );

				images.splice(0);
				done();
			} );
		}

		t.setupEnvironment();
		t.convert( './samples/High_quality_skull.stl', './' + filename, conversionDone );
	} );

} );

describe( 'CLI entry point', function() {
	it( 'Still runs when invoked through a symlink', function() {
		const symlinkPath = './' + uuidv4() + '.js';

		fs.symlinkSync( path.resolve( '3d2png.js' ), symlinkPath );

		try {
			const result = spawnSync( 'node', [ symlinkPath ] );

			assert.strictEqual( result.status, 1 );
			assert( /Usage:/.test( result.stderr.toString() ), 'CLI entry point did not run when invoked via a symlink' );
		} finally {
			fs.unlinkSync( symlinkPath );
		}
	} );
} );
