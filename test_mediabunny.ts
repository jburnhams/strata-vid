
import { BlobSource, Input } from 'mediabunny';
import fs from 'fs';

async function testMedia() {
    try {
        // Since we don't have a real file easily, we'll just check if we can instantiate things
        // or if we can read a dummy file if one exists.
        // For now just print that we can import classes.
        console.log("BlobSource available:", typeof BlobSource);
        console.log("Input available:", typeof Input);

    } catch (e) {
        console.error(e);
    }
}

testMedia();
