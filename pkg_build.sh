#!/bin/bash

CWD=`pwd`
tmpdir="$CWD/tmp/tmp.$(($RANDOM * 19318203981230 + 40))"
version=$(date +"%Y.%m.%d")$1

mkdir -p $tmpdir
chmod 0755 -R .

cd "$CWD/src/folder.view"
cp --parents -f $(find . -type f ! \( -iname "pkg_build.sh" -o -iname "sftp-config.json"  \) ) $tmpdir/

cd $tmpdir
makepkg -l y -c y $CWD/folder.view-${version}.txz

cd $CWD
rm -R $CWD/tmp
chmod 0755 -R .

echo "MD5:"
md5sum $CWD/folder.view-${version}.txz