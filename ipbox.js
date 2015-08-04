var dragDrop = require('drag-drop')

var ipfs = ipfsAPI()

dragDrop("#tiles", function(files) {
	console.log("got some files: ", files)
	files.forEach(function(f, i) {
		console.log("got file: ", f.name)

		var reader = new FileReader()
		reader.addEventListener('load', function (e) {
			var arr = new Uint8Array(e.target.result)
			var buffer = new Buffer(arr)

			ipfs.add(buffer, function(err, res) {
				if(err || !res) return console.error(err)
				console.log(res)
			})
		})
		reader.addEventListener('error', function(err) {
			console.error('FileReader error' + err)
		})
		reader.readAsArrayBuffer(f)
	})
})

function doThings() {
	var root = document.getElementById("tiles")
	var curdir = "/"

	function addDirEntry(entry) {
		var o = document.createElement("div")
		o.className = "item"
		if (entry.Type == 1) {
			o.innerHTML = entry.Name + "/"
		} else {
			o.innerHTML = entry.Name
		}
		o.onclick = function(e) {
			var x = entry
			if (x.Type == 1) {
				console.log(x.Name)
				showDir(x.Name)
			} else {
				ipfs.mfs.read(fs, curdir + "/" + x.Name, function(err, res) {
					if(err || !res) return console.error(err)

						if(res.readable) {
							// Returned as a stream
							res.pipe(process.stdout)
						} else {
							// Returned as a string
							console.log(res)
						}
				})
			}
		}
		root.appendChild(o)
	}

	function showDir(dir) {
		if (dir === "..") {
			parts = curdir.split('/')
			console.log(parts)
			if (parts.length > 2) {

				parts = parts.splice(0, parts.length - 1)
				console.log("shortened: ", parts)
			}
			curdir = parts.join('/')
		} else if (dir != "") {
			curdir = curdir + "/" + dir
		}

		var pathElem = document.getElementById("path")
		pathElem.innerHTML = curdir
		root.innerHTML = ''

		addDirEntry({Name:"..", Type:1})

		console.log('ls -> ', curdir)
		ipfs.mfs.ls(fs, curdir, function(err, res) {
			if(err || !res) {
				console.log("ls failed")
				return console.error(err)
			}

			res.Entries.forEach(function(node) {
				addDirEntry(node)
			})
		})
	}

	function mountMfs(mfs) {
		ipfs.mfs.listopen(function(err, res) {
			if(err || !res) return console.error(err)

			var found = false
			if (res.Mounts) {
				res.Mounts.forEach(function(mount, i) {
					if (mount.Name == mfs) {
						found = true
					}
				})
			}

			if (!found) {
				var dirHash = "QmcQCukqo2eLv2KfGor9uJr5VHx3oLqNbWSt4T5yMpSVtS"
				ipfs.mfs.create(mfs, dirHash, function(err, res) {
					if(err) return console.error(err)
					showDir("")
				})
			} else {
				showDir("")
			}
		})
	}

	fs = "testfs"
	mountMfs(fs)
} 

doThings()
