all:
	browserify -t reactify index.jsx > ipbox.comp.js
