#!/bin/bash

CWD=`pwd`
tmpdir="$CWD/tmp/tmp.$(($RANDOM * 19318203981230 + 40))"
version=$(date +"%Y.%m.%d")
filename="$CWD/archive/folder.view-$version.txz"
dayversion=$(ls $CWD/archive/folder.view-$version*.txz 2>/dev/null | wc -l)

if [ $dayversion -gt 0 ]
then
    filename=$CWD/archive/folder.view-$version.$dayversion.txz
fi

mkdir -p $tmpdir
chmod 0755 -R .

cd "$CWD/src/folder.view"
cp --parents -f $(find . -type f ! \( -iname "pkg_build.sh" -o -iname "sftp-config.json"  \) ) $tmpdir/

cd $tmpdir
makepkg -l y -c y $filename

cd $CWD
rm -R $CWD/tmp
chmod 0755 -R .

echo "MD5:"
md5sum $filename