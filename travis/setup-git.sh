#!/bin/bash
#
# Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
# http://paperjs.org/
#
# Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
# http://juerglehni.com/ & https://puckey.studio/
#
# Distributed under the MIT license. See LICENSE file for details.
#
# All rights reserved.

# Setup the git user with the right credentials so we can push to the paper.js
# repository. The GH_TOKEN is generated as a secure environment variable:
#
# travis encrypt GH_TOKEN=<TOKEN> --add
git config user.name "Paper.js Bot"
git config user.email "bot@paperjs.org"
git config credential.helper "store --file .git/credentials"
echo "https://${GH_TOKEN}:@github.com" > .git/credentials

# It took ages to figures this one out:
# Travis CI sets up the origin to only fetch the specific branch, e.g.:
#     fetch = +refs/heads/develop:refs/remotes/origin/develop
# Since we want to deploy to prebuilt/module also, we need to change that:
#     fetch = +refs/heads/*:refs/remotes/origin/*
# We can change the fetch setting by removing and adding the origin again:
git remote remove origin
git remote add origin https://github.com/paperjs/paper.js.git

# Avoid detached head...
git checkout -f $TRAVIS_BRANCH
