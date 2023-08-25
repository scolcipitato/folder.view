#!/bin/bash

CWD=`pwd`

rm -Rf $CWD/src/folder.view/usr/local/emhttp/plugins/folder.view/*
cp /usr/local/emhttp/plugins/folder.view/* $CWD/src/folder.view/usr/local/emhttp/plugins/folder.view -R -v -p
chmod -R 0755 ./
chown -R root:root ./