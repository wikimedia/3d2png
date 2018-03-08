var assert = require( 'assert' );

describe( 'STL', function() {
	var threed = require( './3d2png' ),
		msssim = require( 'image-ms-ssim' ),
		fs = require( 'fs' ),
		PNG = require( 'pngjs' ).PNG,
		uuid = require( 'uuid' ),
		filename = uuid.v4() + '.png',
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

		var t = new threed.ThreeDtoPNG( 640, 480 );

		function conversionDone() {
			loadImages( './' + filename, './samples/DavidStatue.png', function( images ) {
				var score = msssim.compare( images[0], images[1] );

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

		var t = new threed.ThreeDtoPNG( 640, 480 );

		function conversionDone() {
			loadImages( './' + filename, './samples/Half_Torus.png', function( images ) {
				var score = msssim.compare( images[0], images[1] );

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

		var t = new threed.ThreeDtoPNG( 640, 480 );

		function conversionDone() {
			loadImages( './' + filename, './samples/High_quality_skull.png', function( images ) {
				var score = msssim.compare( images[0], images[1] );

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
