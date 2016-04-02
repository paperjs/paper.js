# Paper.js - The Swiss Army Knife of Vector Graphics Scripting [![Build Status](https://travis-ci.org/paperjs/paper.js.svg?branch=develop)](https://travis-ci.org/paperjs/paper.js) [![NPM](https://img.shields.io/npm/v/paper.svg)](https://www.npmjs.com/package/paper) ![Bower](https://img.shields.io/bower/v/paper.svg)

If you want to work with Paper.js, simply download the latest "stable" version
from [http://paperjs.org/download/](http://paperjs.org/download/)

- Website: <http://paperjs.org/>
- Discussion forum: <http://groups.google.com/group/paperjs>
- Mainline source code: <https://github.com/paperjs/paper.js>
- Twitter: [@paperjs](http://twitter.com/paperjs)
- Latest releases: <http://paperjs.org/download/>
- Pre-built development versions: [`prebuilt/module`](https://github.com/paperjs/paper.js/tree/prebuilt/module)
and [`prebuilt/dist`](https://github.com/paperjs/paper.js/tree/prebuilt/dist) branches.

## Installing Paper.js

The recommended way to install and maintain Paper.js as a dependency in your
project is through NPM or Bower for browsers, and through NPM for Node.js.

If NPM or Bower is already installed, simply type one of these
commands in your project folder:

    npm install paper

or:
    
    bower install paper

Upon execution, you will find a `paper` folder inside the project's
`node_modules` / `bower_components` folder.

For more information on how to install NPM and Bower, read the chapter
[Installing Node.js, NPM and Bower](#installing-nodejs-npm-and-bower).

To learn more about its features for dependence tracking, see
<http://bower.io/>.

### Which Version to Use?

The various distributions come with two different pre-build versions of
Paper.js, in minified and normal variants:

- `paper-full.js` – The full version for the browser, including PaperScript
  support and Acorn.js
- `paper-core.js` – The core version for the browser, without PaperScript
  support nor Acorn.js. You can use this to shave off some bytes and compilation
  time when working with JavaScript directly.

### Installing Node.js, NPM and Bower

Node.js is required by Bower, as well as by Gulp.js, which needs to be installed
if you intend to build the library or its documentation by yourself.

There are many tutorials explaining the different ways to install Node.js on
different platforms. It is generally not recommended to install Node.js through
OS-supplied package managers, as the its development cycles move fast and these
versions are often out-of-date.

NVM can be used instead to install and maintain multiple versions of Node.js on
the same platform, as often required by different projects:
<http://blog.dynamicprogrammer.com/2014/02/18/installing-node-js-on-mac-osx.html>

on OSX, [Homebrew](http://brew.sh/) is also a good option if one version of
Node.js on the platform is enough:
<http://blog.teamtreehouse.com/install-node-js-npm-mac>

Homebrew is recommended on OSX also if you intend to install Paper.js for
Node.js, as described in the next paragraph.

For Linux see <http://nodejs.org/download/> to locate 32-bit and 64-bit nodejs
binaries as well as sources, or use NVM: <http://learn.bevry.me/node/install/>

Once Node.js (with NPM) has been installed you can install bower *globally*
using the following command:

    npm install -g bower

And from there onwards, you should be able to use Bower like this:

    bower search paperjs

### Installing Paper.js for Node.js through NPM

NPM is used to install Paper.js for use in Node.js. But before installing, you
need the Cairo Graphics library installed, see: <http://cairographics.org/>.

##### Installing Cairo and Pango on OSX:

The easiest way to install Cairo is install Homebrew
<http://mxcl.github.io/homebrew/> then issue the command:

    brew install cairo pango

Note that currently there is an issue on OSX with Cairo. If the above causes
errors, the following will most likely fix it:

    PKG_CONFIG_PATH=/opt/X11/lib/pkgconfig/ npm install paper

Also, whenever you would like to update the modules, you will need to execute:

    PKG_CONFIG_PATH=/opt/X11/lib/pkgconfig/ npm update

If you keep forgetting about this requirement, or would like to be able to type
simple and clean commands, add this to your `.bash_profile` file:

    # PKG Config for Pango / Cairo
    export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig:/opt/X11/lib/pkgconfig

After adding this line, your commands should work in the expected way:

    npm install paper
    npm update

##### Installing Cairo, Pango and all other dependencies on Debian/Ubuntu Linux:

    sudo apt-get install libcairo2-dev libpango1.0-dev libssl-dev libjpeg62-dev libgif-dev

You might also need to install the build-essential package if you don't usually
build from c++ sources:

    sudo apt-get install build-essential

##### After Cairo has been installed:

You should now be able to install the Paper.js module from NPM:

    npm install paper

## Development

The main Paper.js source tree is hosted on
[GitHub](https://github.com/paperjs/paper.js/). `git` is required to create a
clone of the repository, and can be easily installed through your preferred
package manager on your platform.

### Get the Source

    git clone --recursive git://github.com/paperjs/paper.js.git
    cd paper.js

To refresh your clone and fetch changes from origin, run:

    git fetch origin

To update the `jsdoc-toolkit` submodule, used to generate the documentation,
run:

    git submodule update  --init --recursive

### Setting Up For Building

As of 2016, Paper.js uses [Gulp.js](http://gulpjs.com/) for building, and has a
couple of dependencies as Bower and NPM modules. Read the chapter [Installing
Node.js, NPM and Bower](#installing-nodejs-npm-and-bower) if you still need to
install these.

In order to be able to build Paper.js, after checking out the repository, paper
has dependencies that need to be installed. Install them by issuing the
following commands from the Paper.js directory:

    npm install

It is also recommended to install Gulp.js globally, so you can easier execute
the build commands from anywhere in the command line:

    npm install -g gulp

### Building the Library

The Paper.js sources are distributed across many separate files, organised in
subfolders inside the `src` folder. To compile them all into distributable
files, you can run the `build` task:

    gulp build

You will then find the built library files inside the `dist` folder, named
`paper-full.js` and `paper-core.js`, along with their minified versions. Read
more about this in [Which Version to Use?](#which-version-to-use).

### Running Directly from Separate Source Files

As a handy alternative to building the library after each change to try it out
in your scripts, there is the `load` task, that replaces the built libraries
with symbolic links to the `scrc/load.js` script. This script then load the
library directly from all the separate source files in the `src` folder, through
the [Prepro.js](https://github.com/lehni/prepro.js) JavaScript preprocessing
library.

This means you can switch between loading from sources and loading a built
library simply by running.

    gulp load

And to go back to a built library

    gulp build

Note that your PaperScripts examples do not need to change, they can keep
loading `dist/paper-full.js`, which will always do the right thing. Note also
that `src/load.js` handles both browsers and Node.js, as supported by Prepro.js.

### Other Build Tasks

Create a final zipped distribution file inside the `dist` folder:

    gulp dist

And since `dist` is the default task, this is the same:

    gulp

### Branch structure

Since the release of version `0.9.22`, Paper.js has adopted aspects of the Git-
Flow workflow. All development is taking place in the
[`develop`](https://github.com/paperjs/paper.js/tree/develop) branch, which is
only merged into [`master`](https://github.com/paperjs/paper.js/tree/master)
when a new release occurs.

As of version `0.9.26`, the `dist` folder is excluded on all branches, and the
building is now part of the `npm publish` process by way of the `prepublish`
script.

We also offer prebuilt versions of the latest state of the `develop` branch on
[`prebuilt/module`](https://github.com/paperjs/paper.js/tree/prebuilt/module)
and [`prebuilt/dist`](https://github.com/paperjs/paper.js/tree/prebuilt/dist).

### Building the Documentation

Similarly to building the library, you can run the `docs` task to build the
documentation:

    gulp docs

Your docs will then be located at `dist/docs`.

### Testing

Paper.js was developed and tested from day 1 using proper unit testing through
jQuery's [Qunit](http://docs.jquery.com/Qunit). To run the tests after any
change to the library's source, simply open `index.html` inside the `test`
folder in your web browser. There should be a green bar at the top, meaning all
tests have passed. If the bar is red, some tests have not passed. These will be
highlighted and become visible when scrolling down.

If you are testing on Chrome, some of the tests will fail due to the browser's
CORS restrictions. In order to run the browser based tests on Chrome, you need
to run a local web-server through Gulp.js. The following command will handle it
for you, and will also open the browser at the right address straight away:

    gulp test:browser

You can also run the unit tests through PhantomJS in Gulp directly on the
command line:

    gulp test:phantom

To test the Node.js version of Paper.js, use this command:

    gulp test:node

And to test both the PhantomJS and Node.js environments together, simply run:

    gulp test

### Contributing

The main Paper.js source tree is hosted on GitHub, thus you should create a fork
of the repository in which you perform development. See
<http://help.github.com/forking/>.

We prefer that you send a [pull request on GitHub]
(http://help.github.com/pull-requests/) which will then be merged into the
official main line repository. You need to sign the Paper.js CLA to be able to
contribute (see below).

Also, in your first contribution, add yourself to the end of `AUTHORS.md` (which
of course is optional).

**Get the source (for contributing):**

If you want to contribute to the project you will have to [make a
fork](http://help.github.com/forking/). Then do this:

    git clone --recursive git@github.com:yourusername/paper.js.git
    cd paper.js
    git remote add upstream git://github.com/paperjs/paper.js.git

To then fetch changes from upstream, run

    git fetch upstream

#### Creating and Submitting a Patch

As mentioned above, we prefer that you send a
[pull request](http://help.github.com/pull-requests/) on GitHub:

1. Create a fork of the upstream repository by visiting
   <https://github.com/paperjs/paper.js/fork>. If you feel insecure, here's a
   great guide: <http://help.github.com/forking/>

2. Clone of your repository: `git clone
   https://yourusername@github.com/yourusername/paper.js.git`

3. This is important: Create a so-called *topic branch* based on the `develop`
   branch: `git checkout -tb name-of-my-patch develop` where `name-of-my-patch`
   is a short but descriptive name of the patch you're about to create. Don't
   worry about the perfect name though -- you can change this name at any time
   later on.

4. Hack! Make your changes, additions, etc., commit them then push them to your
   GitHub fork: `git push origin name-of-my-patch`

5. Send a pull request to the upstream repository's owner by visiting your
   repository's site at GitHub (i.e. https://github.com/yourusername/paper.js)
   and press the "Pull Request" button. Make sure you are creating the pull
   request to the `develop` branch, not the `master` branch. Here's a good guide
   on pull requests: <http://help.github.com/pull-requests/>

##### Use one topic branch per feature:

Don't mix different kinds of patches in the same branch. Instead, merge them all
together into your `develop` branch (or develop everything in your `develop`
branch and then cherry-pick-and-merge into the different topic branches). Git
provides for an extremely flexible workflow, which in many ways causes more
confusion than it helps you when new to collaborative software development. The
guides provided by GitHub at <http://help.github.com/> are a really good
starting point and reference. If you are fixing an issue, a convenient way to
name the branch is to use the issue number as a prefix, like this: `git checkout
-tb issue-937-feature-add-text-styling`.

#### Contributor License Agreement

Before we can accept any contributions to Paper.js, you need to sign this
[CLA](http://en.wikipedia.org/wiki/Contributor_License_Agreement):

[Contributor License Agreement](https://spreadsheets.google.com/a/paperjs.org/spreadsheet/embeddedform?formkey=dENxd0JBVDY2REo3THVuRmh4YjdWRlE6MQ)

> The purpose of this agreement is to clearly define the terms under which
> intellectual property has been contributed to Paper.js and thereby allow us to
> defend the project should there be a legal dispute regarding the software at
> some future time.

For a list of authors and contributors, please see [AUTHORS]
(https://github.com/paperjs/paper.js/blob/master/AUTHORS.md).

## License

Distributed under the MIT license. See [LICENSE]
(https://github.com/paperjs/paper.js/blob/master/LICENSE.txt) for details.
