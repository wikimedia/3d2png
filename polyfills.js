function TextDecoder( encoding, options ) {
	this.encoding = encoding || 'utf-8';
}

TextDecoder.prototype.decode = function ( buffer ) {
	return new Buffer( buffer ).toString( this.encoding );
}

module.exports = {
	window: {
		addEventListener: function ( eventName, callback ) {
			// dummy
		},
		removeEventListener: function ( eventName, callback ) {
			// dummy
		},
		TextDecoder: TextDecoder
	},
	TextDecoder: TextDecoder
};
