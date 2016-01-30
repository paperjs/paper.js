#!/bin/bash

# Only deploy on the stable version, as we're testing against different Node.js
# versions, but stable will always be checked against. This is to ensure that we
# don't deploy twice on each build.

if [ "${TRAVIS_NODE_VERSION}" = "stable" ];
    # Create a clean distribution in a tmp folder
    mkdir ~/tmp
    cp -a dist ~/tmp/
    cp -p *.* ~/tmp/
    rm ~/tmp/dist/.gitignore
    rm ~/tmp/gulpfile.js
    # Now reset the branch so we can switch to a new orphaned build branch
    git clean -fdx # Remove all ignored and untracked files from the build
    git checkout -- . # Reset all tracked files to the original state
    # Create a new orphaned build branch and switch to it
    git checkout --orphan build
    # Remove and delete all tracked files
    git rm -rf .
    # Now move the prepared build back into the branch and commit.
    mv ~/tmp/* .
    rmdir ~/tmp
    git add --all *
    git commit -m "Build for ${TRAVIS_COMMIT}"
    # Push with --force since we're always overriding the previous built version
    git push -u origin build --force
fi
