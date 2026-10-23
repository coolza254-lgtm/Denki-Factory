package dev.denki.factory;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

/** A single read-only private-cache APK, shared only through an explicit URI grant. */
public final class UpdateProvider extends ContentProvider {
    public static final Uri APK_URI=Uri.parse("content://dev.denki.factory.updates/apk");
    public static File apkFile(android.content.Context context) { return new File(context.getCacheDir(),"denki-update.apk"); }
    private void requireApk(Uri uri) { if(!APK_URI.equals(uri)) throw new IllegalArgumentException("Unknown update URI"); }
    @Override public boolean onCreate() { return true; }
    @Override public String getType(Uri uri) { requireApk(uri);return "application/vnd.android.package-archive"; }
    @Override public ParcelFileDescriptor openFile(Uri uri,String mode) throws FileNotFoundException {
        requireApk(uri);
        if(!"r".equals(mode)) throw new FileNotFoundException("Read only");
        return ParcelFileDescriptor.open(apkFile(getContext()),ParcelFileDescriptor.MODE_READ_ONLY);
    }
    @Override public Cursor query(Uri uri,String[] projection,String selection,String[] args,String sort) {
        requireApk(uri);
        String[] columns=projection==null ? new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE} : projection;
        MatrixCursor result=new MatrixCursor(columns);Object[] row=new Object[columns.length];
        for(int i=0;i<columns.length;i++) {
            if(OpenableColumns.DISPLAY_NAME.equals(columns[i])) row[i]="denki-update.apk";
            if(OpenableColumns.SIZE.equals(columns[i])) row[i]=apkFile(getContext()).length();
        }
        result.addRow(row);return result;
    }
    @Override public Uri insert(Uri uri,ContentValues values) { throw new UnsupportedOperationException("Read only"); }
    @Override public int delete(Uri uri,String where,String[] args) { throw new UnsupportedOperationException("Read only"); }
    @Override public int update(Uri uri,ContentValues values,String where,String[] args) { throw new UnsupportedOperationException("Read only"); }
}
