'use strict';
const AWS = require('aws-sdk');
const S3 = new AWS.S3({
    signatureVersion: 'v4',
});
const Sharp = require('sharp');

exports.handler = async (event) => {
    try {
        const srcBucket = event.Records[0].s3.bucket.name;
        const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
        
        if (srcKey.indexOf('media/catalog/product/cache/') > -1) {
            throw new Error('Cache no need to resize');
        }
        
        const typeMatch = srcKey.match(/\.([^.]*)$/);
        if (!typeMatch) {
            throw new Error("Could not determine the image type.");
        }
        
        const imageType = typeMatch[1];
        if (!["jpg", "png", "jpeg", "webp"].includes(imageType.toLowerCase())) {
            throw new Error(`Unsupported image type: ${imageType}`);
        }

        const requiredFormats = ['webp', imageType];
        const sizes=['600x370', '240x300', '848x478', '700x300', '265x265', '322x184', '272x165', '171x98', '270x190', '118x68', '285x285', '75x75', '268x153', '135x135', '75x90', '113x113', '600x344', '140x140', '100x100', '345x200', '270x270', '78x78', '90x90', '174x98', '270x207', '700x700', '118x118', '76x76', '296x170', '770x330', '424x243', '800x500', '360x360'];
        
        for (const format of requiredFormats) {
            const data = await S3.getObject({ Bucket: srcBucket, Key: srcKey }).promise();
            
            for (const size of sizes) {
                const srckeyformat = srcKey.substring(0, srcKey.lastIndexOf("."));
                const key = `${size}/${srckeyformat}.${format}`;
                const dimension = size.split('x');
                const width = parseInt(dimension[0]);
                const height = parseInt(dimension[1]);
                
                const buffer = await Sharp(data.Body)
                    .resize(width, height, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 1 } })
                    .toFormat(format)
                    .toBuffer();
                
                await S3.putObject({
                    Body: buffer,
                    Bucket: srcBucket,
                    ContentType: `image/${format}`,
                    CacheControl: 'max-age=31536000',
                    Key: key,
                    StorageClass: 'STANDARD'
                }).promise();
            }
        }

        return { statusCode: 200, body: 'Success' };
    } catch (error) {
        console.error('Exception:', error);
        throw error;
    }
};
