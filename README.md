# Paper.js - The Swiss Army Knife of Vector Graphics Scripting [![CI](https://github.com/paperjs/paper.js/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/paperjs/paper.js/actions/workflows/ci.yml) [![NPM](https://img.shields.io/npm/v/paper.svg)](https://www.npmjs.com/package/paper)

If you want to work with Paper.js, simply download the latest "stable" version
from [http://paperjs.org/download/](http://paperjs.org/download/)

- Website: <http://paperjs.org/>
- Questions: <https://stackoverflow.com/questions/tagged/paperjs>
- Discussion forum: <https://groups.google.com/group/paperjs>
- Mainline source code: <https://github.com/paperjs/paper.js>
- Twitter: [@paperjs](https://twitter.com/paperjs)
- Latest releases: <http://paperjs.org/download/>
- Pre-built development versions:
  [`prebuilt/module`](https://github.com/paperjs/paper.js/tree/prebuilt/module)
  and [`prebuilt/dist`](https://github.com/paperjs/paper.js/tree/prebuilt/dist)
  branches.

## Installing Paper.js

The recommended way to install and maintain Paper.js as a dependency in your
project is through the [Node.js Package Manager (NPM)](https://www.npmjs.com/)
for browsers, Node.js or Electron.

If NPM is already installed, simply type one of these commands in your project
folder:

```sh
npm install paper
```

Upon execution, you will find a `paper` folder inside the project's
`node_modules` folder.

For more information on how to install Node.js and NPM, read the chapter
[Installing Node.js and NPM](#installing-nodejs-and-npm).

### Using Paper.js with a Bundler

With a bundler such as webpack, Rollup, esbuild or Vite, import Paper.js and
set it up with a canvas element:

```js
import paper from 'paper'

paper.setup(document.getElementById('canvas'))

const { Path } = paper
const circle = new Path.Circle({
  center: paper.view.center,
  radius: 30,
  fillColor: 'red'
})

paper.view.onFrame = event => {
  circle.rotate(1)
}
```

The module exports the first `paper` scope as its default export, with all
classes as its properties, and the classes as named exports too. Use
`paper.view` and `paper.project` after calling `paper.setup()`, rather than
importing them, as they only exist from then on.

The package has these entries:

- `paper` – The core library, also as `paper/core`.
- `paper/paperscript` – PaperScript, which adds the operators and the loading
  of `<script type="text/paperscript">` tags when imported, and exports
  `PaperScript` to compile and execute code. It brings Acorn.js along.
- `paper/node` – The core library on Node.js, see
  [Using Paper.js on Node.js](#using-paperjs-on-nodejs).
- `paper/hosted` – The core library with hosted projects, whose items a host
  stores and loads on demand.

### Script Files

For `<script>` tags, the package also comes with two script files, in minified
and normal variants, which set the global `paper`:

- `dist/paper-full.js` – The full version, including PaperScript and Acorn.js
- `dist/paper-core.js` – The core version, without PaperScript and Acorn.js.
  You can use this to shave off some bytes and compilation time when working
  with JavaScript directly.

### Installing Node.js and NPM

Node.js comes with the Node Package Manager (NPM). There are many tutorials
explaining the different ways to install Node.js on different platforms. It is
generally not recommended to install Node.js through OS-supplied package
managers, as the its development cycles move fast and these versions are often
out-of-date.

On macOS, [Homebrew](https://brew.sh/) is a good option if one version of
Node.js that is kept up to date with `brew upgrade` is enough:  
<https://treehouse.github.io/installation-guides/mac/node-mac.html>

[NVM](https://github.com/creationix/nvm) can be used instead to install and
maintain multiple versions of Node.js on the same platform, as often required by
different projects:  
<https://nodesource.com/blog/installing-node-js-tutorial-using-nvm-on-mac-os-x-and-ubuntu/>

For Linux, see <https://nodejs.org/download/> to locate 32-bit and 64-bit
Node.js binaries as well as sources, or use NVM, as described in the paragraph
above.

### Using Paper.js on Node.js

On Node.js, Paper.js draws through
[happy-dom](https://github.com/capricorn86/happy-dom) and
[@napi-rs/canvas](https://github.com/Brooooooklyn/canvas), which come with
prebuilt binaries and need no native libraries. Install them next to Paper.js:

    npm install paper happy-dom @napi-rs/canvas

Then import the `paper/node` entry, which sets up a window for Paper.js to draw
in:

```js
import paper from 'paper/node'

paper.setup(new paper.Size(300, 200))
new paper.Path.Circle({ center: [150, 100], radius: 50, fillColor: 'red' })
await paper.view.exportImage('circle.png')
```

Views on Node.js can write their image with `exportImage(path)`, and the frames
of their animation with `exportFrames(options)`. Fonts for text are registered
with the exported `GlobalFonts`, e.g.
`GlobalFonts.registerFromPath('fonts/Inter.ttf', 'Inter')`. Paper.js needs
Node.js 22.22 or newer.

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

Paper.js is written in TypeScript, builds with
[Rolldown](https://rolldown.rs/), and has a couple of dependencies as NPM
modules. Read the chapter [Installing Node.js and
NPM](#installing-nodejs-and-npm) if you still need to install these.

Development uses [pnpm](https://pnpm.io/), which needs to be installed too. See
[Installing pnpm](https://pnpm.io/installation) for details.

In order to be able to build Paper.js, after checking out the repository, paper
has dependencies that need to be installed. Install them by issuing the
following commands from the Paper.js directory:

    pnpm install

### Building the Library

The Paper.js sources are distributed across many separate files, organised in
subfolders inside the `src` folder. To build them into the distributed files,
run:

    pnpm build

You will then find the ES modules of the entries in `dist/esm`, their type
declarations in `dist/types`, and the script files `paper-full.js` and
`paper-core.js` in `dist`, along with their minified versions and source maps.
Read more about this in [Script Files](#script-files).

### Running Directly from the Sources

The sources are ES modules in TypeScript that Node.js runs without a build,
and so do the tests, so changes can be tried without building the library.

### Other Build Tasks

Create a zipped distribution file of the script files and the examples inside
the `dist` folder, after building the library:

    pnpm zip

Release the version in `package.json` from the `develop` branch, which commits,
tags and pushes it for the release workflow to build and publish:

    pnpm release

### Branch structure

Since the release of version `0.9.22`, Paper.js has adopted aspects of the Git-
Flow workflow. All development is taking place in the
[`develop`](https://github.com/paperjs/paper.js/tree/develop) branch, which is
only merged into [`main`](https://github.com/paperjs/paper.js/tree/main)
when a new release occurs.

The `dist` folder is excluded on all branches, and the release workflow on
GitHub Actions builds the library from the tag of each release.

We also offer prebuilt versions of the latest state of the `develop` branch on
[`prebuilt/module`](https://github.com/paperjs/paper.js/tree/prebuilt/module)
and [`prebuilt/dist`](https://github.com/paperjs/paper.js/tree/prebuilt/dist).

### Testing

The tests run with [Vitest](https://vitest.dev/), on Node.js and in Chromium
through [Playwright](https://playwright.dev/), on the sources:

    pnpm test

To run them only on Node.js, or only in the browser:

    pnpm test:node
    pnpm test:browser

The browser tests need Chromium for Playwright, which this installs once:

    pnpm exec playwright install chromium

Vitest also runs single files, and watches for changes with
`pnpm exec vitest`.

The screenshot tests in `test/screenshots` compare what the library draws with
reference images. Rendering differs between systems, so they run in Playwright's
Docker image, which needs [Docker](https://www.docker.com/):

    pnpm test:screenshots

To write new reference images, after adding a test or changing what it draws,
and review them in `test/screenshots/__screenshots__` before committing:

    pnpm test:screenshots --update

### Contributing [![Open Source Helpers](https://www.codetriage.com/paperjs/paper.js/badges/users.svg)](https://www.codetriage.com/paperjs/paper.js)

The main Paper.js source tree is hosted on GitHub, thus you should create a fork
of the repository in which you perform development. See
<https://help.github.com/articles/fork-a-repo/>.

We prefer that you send a
[pull request on GitHub](https://help.github.com/articles/about-pull-requests/) 
which will then be merged into the official main line repository.

Also, in your first contribution, add yourself to the end of `AUTHORS.md` (which
of course is optional).

In addition to contributing code you can also triage issues which may include
reproducing bug reports or asking for vital information, such as version numbers
or reproduction instructions. If you would like to start triaging issues, one
easy way to get started is to
[subscribe to paper.js on CodeTriage](https://www.codetriage.com/paperjs/paper.js).

**Get the source (for contributing):**

If you want to contribute to the project you will have to [make a
fork](https://help.github.com/articles/fork-a-repo/). Then do this:

    git clone --recursive git@github.com:yourusername/paper.js.git
    cd paper.js
    git remote add upstream git@github.com:paperjs/paper.js.git

To then fetch changes from upstream, run

    git fetch upstream

#### Creating and Submitting a Patch

As mentioned above, we prefer that you send a
[pull request](https://help.github.com/articles/about-pull-requests/) on GitHub:

1. Create a fork of the upstream repository by visiting
   <https://github.com/paperjs/paper.js/fork>. If you feel insecure, here's a
   great guide: <https://help.github.com/articles/fork-a-repo/>

2. Clone of your repository: `git clone
   https://yourusername@github.com/yourusername/paper.js.git`

3. This is important: Create a so-called *topic branch* based on the `develop`
   branch: `git checkout -tb name-of-my-patch develop` where `name-of-my-patch`
   is a short but descriptive name of the patch you're about to create. Don't
   worry about the perfect name though -- you can change this name at any time
   later on.

4. Hack! Make your changes, additions, etc., and describe them for the
   changelog in a file of their own in `changelog/unreleased`, see its
   [README](changelog/unreleased/README.md). Commit them then push them to your
   GitHub fork: `git push origin name-of-my-patch`

5. Send a pull request to the upstream repository's owner by visiting your
   repository's site at GitHub (i.e. https://github.com/yourusername/paper.js)
   and press the "Pull Request" button. Make sure you are creating the pull
   request to the `develop` branch, not the `main` branch. Here's a good guide
   on pull requests: <https://help.github.com/articles/about-pull-requests/>

##### Use one topic branch per feature:

Don't mix different kinds of patches in the same branch. Instead, merge them all
together into your `develop` branch (or develop everything in your `develop`
branch and then cherry-pick-and-merge into the different topic branches). Git
provides for an extremely flexible workflow, which in many ways causes more
confusion than it helps you when new to collaborative software development. The
guides provided by GitHub at <https://help.github.com/> are a really good
starting point and reference. If you are fixing an issue, a convenient way to
name the branch is to use the issue number as a prefix, like this: `git checkout
-tb issue-937-feature-add-text-styling`.

For a list of authors and contributors, please see 
[AUTHORS](https://github.com/paperjs/paper.js/blob/main/AUTHORS.md).

## License

Distributed under the MIT license. See 
[LICENSE](https://github.com/paperjs/paper.js/blob/main/LICENSE.txt)
for details.
