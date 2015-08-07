# File Browser Thing

This is the beginning of a file browser UI for ipfs. 

Note: right now it depends on changes to go-ipfs, node-ipfs-api, and feross's drag-drop that have not merged. If you want to try this out, there is a bit of pre-setup work youll need to do:

- run feat/mfs branch of go-ipfs
- run the daemon in a way that allows different origins
- use the node-ipfs-api branch that has mfs support
- use the version of feross/drag-drop from this PR: https://github.com/feross/drag-drop/pull/5
