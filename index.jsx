var React = require('react')
var ipfs = require('ipfs-api')()
var dragDrop = require('drag-drop')

var fs = "testfs"

function mountMfs(mfs, defaultHash) {
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
			var dirHash = defaultHash || "QmcQCukqo2eLv2KfGor9uJr5VHx3oLqNbWSt4T5yMpSVtS"
			ipfs.mfs.create(mfs, dirHash, function(err, res) {
				if(err) return console.error(err)
				chdir("/")
			})
		} else {
			chdir("/")
		}
	})
}

var dispatch = (function () {
    var events = {};
    return {
        fire: function (event, context) {
            events[event].forEach(function (fn) {
                fn(context);
            })
        },
        listen: function (event, fn) {
            if (!fn) return false;
            if (!events[event]) {
                events[event] = []
            }
            
            events[event].push(fn);
            return true;
        },
        remove: function(event, fn) {
            if (!events[event]) return false;
            
            var index = events[event].indexOf(fn);
            if (index > -1) {
                events[event].splice(index, 1);
            }
            
            return true;
        }
    }
})();

var DirEntry = React.createClass({
	getInitialState: function() {
		return {
			name: this.props.name,
		}
	},
	contextMenu: function(e) {
		e.preventDefault()
		console.log("right click on an item!")
	},
	render: function() {
		if (this.props.item.Type == 1) {
			return (
				<div onClick={this.props.onClick}
				onDoubleClick={this.props.onDoubleClick}
				className="item" onContextMenu={this.contextMenu}>
				<img className="item-img" src="img/folder.png" />
				<p className="item-title">{this.props.item.Name}</p></div>
			);
		} else {
			return (
				<div className="item" onContextMenu={this.contextMenu}>
				<img className="item-img" src="img/file.png" />
				<p className="item-title">{this.props.item.Name}</p></div>
			);
		}
	}

})

var loaddirs = (function () {
    dispatch.listen('act-chdir', function (ctx) {
		var fs = ctx.fs
		var path = ctx.path.join('/')
		if (ctx.path.length == 0) {
			path = '/'
		}
		ipfs.mfs.ls(fs, path, function(err, res) {
			if (err || !res) return console.error(err)

			dispatch.fire('resp-chdir', {
				entries: res.Entries,
				path: ctx.path,
			})
		})
    })
})();

var Explorer = React.createClass({
	getInitialState: function () {
		this.path = []
        return ({
			entries: [],
			loading: true,
        });
	},
	dragDropHandler: function(files) {
		console.log("got some files: ", files)
		console.log("path = ", this.path)
		var curpath = this.path
		files.forEach(function(f, i) {
			console.log("got file: ", f.name)
			console.log(f)

			var reader = new FileReader()
			reader.addEventListener('load', function (e) {
				var arr = new Uint8Array(e.target.result)
				var buffer = new Buffer(arr)

				ipfs.add(buffer, function(err, res) {
					if(err || !res) return console.error(err)

					var filehash = res.Hash

					// ensure parent dirs are made
					var parentDir = f.path.split('/').slice(0, -1)
					if (parentDir[0] == "") {
						parentDir = parentDir.slice(1)
					}
					var relpath = curpath.concat(parentDir)

					var fpath = relpath.slice()
					fpath.push(f.name)
					console.log(res, fpath)

					ipfs.mfs.mkdir(fs, relpath.join('/'), true, function(err, res) {
						if (err) return console.error(err)

						ipfs.mfs.put(fs, filehash, fpath.join('/'), function(err, res) {
							if (err) return console.error(err)
							
							dispatch.fire('act-chdir', {
								fs: fs,
								path: curpath,
							})
						})
					})
				})
			})
			reader.addEventListener('error', function(err) {
				console.error('FileReader error' + err)
			})
			reader.readAsArrayBuffer(f)
		})
	},

	componentDidMount: function () {
        var self = this;

		dragDrop("#explorer", this.dragDropHandler)

        dispatch.listen('resp-chdir', function (context) {
			self.path = context.path
            self.setState({
				loading: false,
				entries: context.entries,
			})
        })
        
        dispatch.listen('no-file', function () {
            self.setState({
                error: 'No such file or directory',
                loading: false
            })
        })
        
        dispatch.fire('act-chdir', {
			fs: fs,
			path: [],
		});
    },
	chdir: function (item) {
        this.setState({
            loading: true
        })
		npath = this.path.slice()
		npath.push(item.Name)
		console.log("this path: ", this.path)

		console.log("changing to: ", npath)
        dispatch.fire('act-chdir', {
			fs: fs,
			path: npath,
		})
    },
	up: function() {
		this.setState({loading:true})
		npath = this.path.slice()
		npath.pop()
		dispatch.fire('act-chdir', {
			fs: fs,
			path: npath,
		})
	},
	selectEntry: function(e) {
		console.log("entry selected", e)
	},
	render: function() {

		if (this.state.entries) {
			var entries = this.state.entries.map(function iterator(item) {
				return (<DirEntry onClick={this.selectEntry.bind(this, item)} 
						onDoubleClick={this.chdir.bind(this, item)} item={item} />)
			}, this)
		}

		upBox = {
			Name: "..",
			Type: 1,
		}

		return (
		<div className="container">
		{this.state.loading ? <div> LOADING!!! </div> : undefined}
		<div className="pathbar">{"/" + this.path.join("/")}</div>
		<div className="explorer" id="explorer">

		// '..' dir unless we're at the root
		{this.path.length > 0 ?
		<DirEntry onClick={this.selectEntry.bind(this, upBox)}
		onDoubleClick={this.up} item={upBox} /> : undefined}

		// directory entries
		{entries}
		
		</div></div>
		);
	}
})

React.render(<Explorer />, document.getElementById('container'));
