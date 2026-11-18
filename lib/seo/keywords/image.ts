import type { ToolKeywordCluster } from "../keyword-clusters";

/**
 * Image cluster. All four tools are local, so the "without uploading" family is
 * available — but it is claimed by the compressor only, and the other three
 * lead with their own distinctive phrasing so the four pages do not blur.
 */
export const imageKeywordClusters: ToolKeywordCluster[] = [
  {
    slug: "image-compressor",
    primary: "image compressor",
    secondary: [
      "compress image to 100kb",
      "reduce jpg file size",
      "compress image for job application form",
      "webp compressor online",
      "bulk image compression",
    ],
    groups: {
      alternativeName: [
        "photo compressor",
        "image size reducer",
        "jpg compressor",
      ],
      synonym: [
        "make image smaller in kb",
        "reduce photo size",
        "shrink a picture file",
        "lower image file size",
      ],
      action: [
        "compress an image to an exact kb size",
        "compress 20 images at once into a zip",
        "compress a png and keep it transparent",
      ],
      longTail: [
        "compress image to 50kb without losing quality",
        "compress photo to 20kb for an online form",
        "compress webp and avif images in bulk",
      ],
      problem: [
        "upload form rejects my photo for being too large",
        "photo is 5mb and the limit is 200kb",
      ],
      question: [
        "how to compress an image without losing quality",
        "how do i reduce the size of a jpg",
        "what is the best image compression tool",
      ],
      qualifier: [
        "image compressor online free",
        "compress image without uploading",
      ],
      india: ["photo ka size kaise kam kare", "image compress kaise kare"],
    },
    audience: "People hitting a KB limit on a form, portal or attachment",
  },
  {
    slug: "image-resizer",
    primary: "image resizer",
    secondary: [
      "resize image in pixels",
      "resize photo for passport size",
      "resize image for instagram",
      "resize image without losing quality",
      "bulk image resize online",
    ],
    groups: {
      alternativeName: ["photo resizer", "picture resizer", "image scaler"],
      synonym: [
        "change image dimensions",
        "make a photo bigger or smaller",
        "set exact width and height of an image",
      ],
      action: [
        "resize an image to exact pixel dimensions",
        "resize a photo to a passport size",
        "resize 20 images to the same width",
      ],
      longTail: [
        "resize image to 1080x1080 without cropping",
        "resize photo to 2x2 inches for a form",
        "resize images to a percentage of their size",
      ],
      problem: [
        "photo needs exact pixels for a government form",
        "image is too wide to upload",
      ],
      question: [
        "how to resize an image",
        "how do i resize a photo without losing quality",
        "what pixel size should i use for instagram",
      ],
      qualifier: [
        "image resizer online free",
        "resize photo free without watermark",
      ],
      india: [
        "passport size photo kaise banaye",
        "photo ka size pixel me kaise badle",
      ],
    },
    audience: "People matching an exact pixel requirement for forms and posts",
  },
  {
    slug: "image-cropper",
    primary: "image cropper",
    secondary: [
      "crop image online free",
      "circle crop profile picture",
      "crop image to 1:1",
      "crop photo for whatsapp dp",
      "batch crop images",
    ],
    groups: {
      alternativeName: ["photo cropper", "picture cropper", "image cutter"],
      synonym: [
        "cut an image to a shape",
        "trim an image to a square",
        "make an image circular",
      ],
      action: [
        "crop an image to a fixed aspect ratio",
        "crop a photo into a circle for a profile picture",
        "crop 20 images the same way",
      ],
      longTail: [
        "crop image to 16:9 without stretching it",
        "crop a photo into a circle with a transparent background",
        "crop several images to the same ratio at once",
      ],
      problem: [
        "the face is centred wrong in my profile photo",
        "image has empty margins i need to remove",
      ],
      question: [
        "how to crop an image",
        "how do i crop a photo into a circle",
        "how to crop multiple images at once",
      ],
      qualifier: ["crop image online free", "free crop tool no signup"],
      india: ["photo kaise crop kare", "dp ke liye photo kaise crop kare"],
    },
    audience: "People fixing framing for avatars, headers and listings",
  },
  {
    slug: "image-to-image",
    primary: "image converter",
    secondary: [
      "jpg to png converter",
      "webp to jpg",
      "png to jpg converter free",
      "heic to jpg in browser",
      "convert images in bulk",
    ],
    groups: {
      alternativeName: ["image format converter", "photo format converter"],
      synonym: [
        "change the format of an image",
        "convert a photo between webp and png",
        "change image file extension by converting",
      ],
      action: [
        "convert jpg to png in bulk",
        "convert webp to jpg for a website",
        "convert bmp and tiff to a modern format",
      ],
      longTail: [
        "convert heic to jpg without an iphone",
        "convert 20 images from png to jpg at once",
        "convert avif to jpg for an older editor",
      ],
      problem: [
        "website will not accept a webp image",
        "iphone photos are heic and my app cannot open them",
      ],
      question: [
        "how to convert jpg to png",
        "how do i change an image format",
        "how to convert webp to jpg",
      ],
      qualifier: ["image converter online free", "free image format converter"],
      india: ["image ka format kaise change kare", "jpg ko png me kaise badle"],
    },
    audience: "People blocked by a format an app or website will not accept",
  },
];
