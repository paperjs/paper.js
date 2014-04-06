# Paper.js - The Swiss Army Knife of Vector Graphics Scripting

If you want to work with Paper.js, simply download the latest "stable" version from [http://paperjs.org/download/](http://paperjs.org/download/)

- Website: <http://paperjs.org/>
- Discussion forum: <http://groups.google.com/group/paperjs>
- Mainline source code: <https://github.com/paperjs/paper.js>
- Twitter: [@paperjs](http://twitter.com/paperjs)
- Daily development builds: <http://paperjs.org/download/>

## Installing Paper.js

You can download prebuilt packages from <http://paperjs.org/download/>.

As of July 2013, the recommended way to install and maintain Paper.js is through Bower for browsers, and through NPM for Node.js.

For OSX see <http://madebyhoundstooth.com/blog/install-node-with-homebrew-on-os-x/> for a tutorial explaining how to install Node.js, NPM and Bower.

For Linux see <http://nodejs.org/download/> to locate 32-bit and 64-bit nodejs binaries as well as sources. It is recommended that you download directly from the nodejs site; the version available via many OS-supplied package managers is out-of-date and doesn't work with many of the packages paper uses. NPM is now included with the nodejs distribution. Once nodejs (with npm) has been installed you can install bower using the following command:

	npm install -g bower

With Bower installed, simply type this command in your project folder:

	bower install paper

Upon execution, you will find a `paper` folder inside the project's `bower_components` folder. For more information on Bower and to learn about its features for dependence tracking, see <http://bower.io/>.

## Which Version to Use?

The various distributions come with three different pre-build versions of Paper.js, in minified and normal variants:

- `paper-full.js` – The full version for the browser, including PaperScript support and Acorn.js
- `paper-core.js` – The core version for the browser, without PaperScript support nor Acorn.js. Use this to shave off some bytes when working with JavaScript directly.
- `paper-node.js` – The version for Node.js. It is recommended to install this through NPM, see below.

## Installing Paper.js for Node.js through NPM

You can also use NPM to install Paper.js for Node.js. But before doing so, you need the Cairo Graphics library installed, see <http://cairographics.org/>.

**Installing Cairo on OSX:**

The easiest way to install Cairo is install Homebrew <http://mxcl.github.io/homebrew/> then issue the command:

	brew install cairo

Note that currently there is an issue on OSX with Cairo. If the above causes errors, the following will most likely fix it:

	PKG_CONFIG_PATH=/opt/X11/lib/pkgconfig/ npm install paper

Also, whenever you would like to update the modules, you will need to execute:

	PKG_CONFIG_PATH=/opt/X11/lib/pkgconfig/ npm update

**Installing Cairo on Debian/Ubuntu Linux:**

	sudo apt-get install libcairo2-dev

You might also need these additional packages if you don't usually build from c++ sources:

	sudo apt-get install build-essential libssl-dev libjpeg8-dev libgif-dev

**Ater Cairo has been installed:**

You should now be able to install the Paper.js module from NPM:

	npm install paper

## Development

**Get the source (for building):**

	git clone --recursive git://github.com/paperjs/paper.js.git

**Get the source (for contributing):**

If you want to contribute to the project you will have to [make a fork](http://help.github.com/forking/). Then do this:

	git clone --recursive git@github.com:yourusername/paper.js.git
	cd paper.js
	git remote add upstream git://github.com/paperjs/paper.js.git

### Refreshing Your Clone

To fetch changes from origin (your fork), run

	git fetch origin

If you are working with a fork and would like to fetch from upstream, run

	git fetch upstream

To update the `jsdoc-toolkit` submodule inside the `build` folder, used to generate the documentation, run

	git submodule update --init

### Building the Library

Paper.js has a couple of dependencies as Bower and NPM modules. See <http://madebyhoundstooth.com/blog/install-node-with-homebrew-on-os-x/> for a tutorial explaining how to install Node.js, NPM and Bower on OSX.

In order to be able to build Paper.js, after checking out the repository, paper has dependencies that need to be installed. Install them by issuing the following commands from the paper.js directory:

	npm install
	bower install

You might find that the npm command fails attempting to fetch packages needed for dependencies due to using https (the default protocol to access the npm registry). If that is the case you can switch to using http for registry access with the following command:

	npm config set registry http://registry.npmjs.org/

Next you need to create minified versions of some of these dependencies. This is handled by the `minify-components.sh` script inside the `build` folder:

	cd build
	./minify-components.sh

The Paper.js sources are distributed across many separate files, organised in subfolders inside the `src` folder. To compile them all into one distributable file, you can run the `build.sh` script inside the `build` folder:

	cd build
	./build.sh

You will then find the built library inside the `dist` folder, named `paper.js`.

`build.sh` offer two modes:

	commented		Preprocessed but still formated and commented
	stripped		Formated but without comments (default)

In order to minify the resulting built versions, you can run the `minify.sh` script:

	cd build
	./minify.sh

### Building the Documentation

Similarly to building the library, you can run `docs.sh` inside the `build` folder to build the documentation.

	cd build
	./docs.sh

Your docs will then be located at `dist/docs`.

### Editing and Running Code during Development

As a handy alternative to building the library after each change to try it out in your scripts, there is a helper script `src/load.js` that loads the library directly from all the separate source files in the `src` folder. The shell script `load.sh` in the `build` folder produces a `paper.js` library in `dist` that does nothing else than loading the source files through `src/load.js`. This means you can switch between loading from sources and loading a built library simply by running `build.sh` or `load.sh` inside the `build` folder.

	cd build
	./load.sh

And to go back to a built library

	cd build
	./build.sh

Note that your PaperScripts examples do not need to change, they can keep loading `dist/paper-full.js`, which will always do the right thing. Note also that `src/load.js` handles both browsers and Node.js, through the handy PrePro JS preprocessing library <http://github.com/lehni/prepro.js>.

### Testing

Paper.js was developed and tested from day 1 using proper unit testing through jQuery's [Qunit](http://docs.jquery.com/Qunit). To run the tests after any change to the library's source, simply open `index.html` inside the `test` folder in your web browser. There should be a green bar at the top, meaning all tests have passed. If the bar is red, some tests have not passed. These will be highlighted and become visible when scrolling down.

### Contributing

The main Paper.js source tree is hosted on git (a popular [DVCS](http://en.wikipedia.org/wiki/Distributed_revision_control)), thus you should create a fork of the repository in which you perform development. See <http://help.github.com/forking/>.

We prefer that you send a [*pull request* here on GitHub](http://help.github.com/pull-requests/) which will then be merged into the official main line repository. You need to sign the Paper.js CLA to be able to contribute (see below).

Also, in your first contribution, add yourself to the end of `AUTHORS.md` (which of course is optional).

#### Creating and Submitting a Patch

As mentioned earlier in this article, we prefer that you send a [*pull request*](http://help.github.com/pull-requests/) on GitHub.

1. Create a fork of the upstream repository by visiting <https://github.com/paperjs/paper.js/fork>. If you feel insecure, here's a great guide: <http://help.github.com/forking/>

2. Clone of your repository: `git clone https://yourusername@github.com/yourusername/paper.js.git`

3. This is important: Create a so-called *topic branch*: `git checkout -tb name-of-my-patch` where "name-of-my-patch" is a short but descriptive name of the patch you're about to create. Don't worry about the perfect name though -- you can change this name at any time later on.

4. Hack! Make your changes, additions, etc., commit them then push them to your github fork: `git push origin name-of-my-patch`


5. Send a pull request to the upstream repository's owner by visiting your repository's site at github (i.e. https://github.com/yourusername/paper.js) and press the "Pull Request" button. Here's a good guide on pull requests: <http://help.github.com/pull-requests/>

**Use one topic branch per feature** -- don't mix different kinds of patches in the same branch. Instead, merge them all together into your master branch (or develop everything in your master and then cherry-pick-and-merge into the different topic branches). Git provides for an extremely flexible workflow, which in many ways causes more confusion than it helps you when new to collaborative software development. The guides provided by GitHub at <http://help.github.com/> are a really good starting point and reference.
If you are fixing a ticket, a convenient way to name the branch is to use the URL slug from the bug tracker, like this: `git checkout -tb 53-feature-manually-select-language`.

#### Contributor License Agreement

Before we can accept any contributions to Paper.js, you need to sign this [CLA](http://en.wikipedia.org/wiki/Contributor_License_Agreement):

[Contributor License Agreement](https://spreadsheets.google.com/a/paperjs.org/spreadsheet/embeddedform?formkey=dENxd0JBVDY2REo3THVuRmh4YjdWRlE6MQ)

> The purpose of this agreement is to clearly define the terms under which intellectual property has been contributed to Paper.js and thereby allow us to defend the project should there be a legal dispute regarding the software at some future time.

For a list of contributors, please see [AUTHORS](https://github.com/paperjs/paper.js/blob/master/AUTHORS.md)

## License

See the file [LICENSE](https://github.com/paperjs/paper.js/blob/master/LICENSE.txt)
