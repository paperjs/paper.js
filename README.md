# Paper.js - The Swiss Army Knife of Vector Graphics Scripting

If you want to work with Paper.js, simply download the latest "stable" version from [http://paperjs.org/downloads/](http://paperjs.org/downloads/)

- Website: <http://paperjs.org/>
- Discussion forum: <http://groups.google.com/group/paperjs>
- Mainline source code: <https://github.com/paperjs/paper.js>
- Twitter: [@paperjs](http://twitter.com/paperjs)
- Daily development builds: <http://paperjs.org/downloads/>

## Development

**Get the source (for building):**

Git 1.6.5 and later:

    git clone --recursive git://github.com/paperjs/paper.js.git

Git 1.6.4 and earlier:

	git clone git://github.com/paperjs/paper.js.git
	cd paper.js
	git submodule update --init

**Get the source (for contributing):**

If you want to contribute to the project you will have to [make a fork](http://help.github.com/forking/). Then do this:

    git clone --recursive git@github.com:yourusername/paper.js.git
    git remote add upstream git://github.com/paperjs/paper.js.git

### Refreshing Your Clone

To fetch changes from origin, run

	git fetch origin

If you are working with a fork and would like to fetch from upstream, run

	git fetch upstream

To update the `jsdoc-toolkit` submodule inside the `build` directory, used to generate the documentation, run

	git submodule update --init

### Contributing

The main Paper.js source tree is hosted on git (a popular [DVCS](http://en.wikipedia.org/wiki/Distributed_revision_control)), thus you should create a fork of the repository in which you perform development. See <http://help.github.com/forking/>.

We prefer that you send a [*pull request* here on GitHub](http://help.github.com/pull-requests/) which will then be merged into the official main line repository. You need to sign the Paper.js CLA to be able to contribute (see below).

Also, in your first contribution, add yourself to the end of `AUTHORS.md` (which of course is optional).

#### Creating and Submitting a Patch

As mentioned earlier in this article, we prefer that you send a [*pull request*](http://help.github.com/pull-requests/) on GitHub.

1. Create a fork of the upstream repository by visiting <https://github.com/paperjs/paper.js/fork>. If you feel insecure, here's a great guide: <http://help.github.com/forking/> 

2. Clone of your repository: `git clone https://yourusername@github.com/yourusername/paper.js.git`

3. This is important: Create a so-called *topic branch*: `git checkout -tb name-of-my-patch` where "name-of-my-patch" is a short but descriptive name of the patch you're about to create. Don't worry about the perfect name though -- you can change this name at any time later on.

4. Hack! Make your changes, additions, etc and commit them.

5. Send a pull request to the upstream repository's owner by visiting your repository's site at github (i.e. https://github.com/yourusername/paper.js) and press the "Pull Request" button. Here's a good guide on pull requests: <http://help.github.com/pull-requests/>

**Use one topic branch per feature** -- don't mix different kinds of patches in the same branch. Instead, merge them all together into your master branch (or develop everything in your master and then cherry-pick-and-merge into the different topic branches). Git provides for an extremely flexible workflow, which in many ways causes more confusion than it helps you when new to collaborative software development. The guides provided by GitHub at <http://help.github.com/> are a really good starting point and reference.
If you are fixing a ticket, a convenient way to name the branch is to use the URL slug from the bug tracker, like this: `git checkout -tb 53-feature-manually-select-language`.

#### Contributor License Agreement

Before we can accept any contributions to Paper.js, you need to sign this [CLA](http://en.wikipedia.org/wiki/Contributor_License_Agreement):

[http://paperjs.org/cla.html](http://paperjs.org/cla.html)

> The purpose of this agreement is to clearly define the terms under which intellectual property has been contributed to Paper.js and thereby allow us to defend the project should there be a legal dispute regarding the software at some future time.

For a list of contributors, please see [AUTHORS](https://github.com/paperjs/paper.js/blob/master/AUTHORS.md)

## License

See the file [LICENSE](https://github.com/paperjs/paper.js/blob/master/LICENSE.txt)
