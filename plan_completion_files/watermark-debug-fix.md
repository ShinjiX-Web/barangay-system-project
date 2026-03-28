# Watermark Debug & Fix - Complete ✅

## Problem
The watermark logo (Seal_of_Angeles_City.png) was not appearing behind the certificate text because:
1. CSS rules with `background-color: #fff !important` were overriding the inline `background: url(...)` 
2. The `:not(.cert-watermark)` selector wasn't specific enough
3. CSS specificity was causing the white background to win over the watermark

## Solution Applied

### Changed From Exclusion to Explicit Declaration
Instead of trying to exclude the watermark from white background rules, we now **explicitly declare** the watermark's background in CSS with high specificity.

### Files Updated

#### 1. certificates.html
Added explicit watermark CSS rules that override any conflicting styles:

```css
/* Force preserve watermark's background property */
#certPreviewContent .cert-watermark,
.cert-print-area .cert-watermark {
    background: url('assets/img/Seal_of_Angeles_City.png') no-repeat center center !important;
    background-size: contain !important;
    background-color: transparent !important;
}

/* Dark mode version */
[data-bs-theme="dark"] #certPreviewContent .cert-watermark,
[data-bs-theme="dark"] .cert-print-area .cert-watermark {
    background: url('assets/img/Seal_of_Angeles_City.png') no-repeat center center !important;
    background-size: contain !important;
    background-color: transparent !important;
}

/* Print version */
@media print {
    .cert-watermark {
        background: url('assets/img/Seal_of_Angeles_City.png') no-repeat center center !important;
        background-size: contain !important;
        background-color: transparent !important;
        opacity: 0.13 !important;
    }
}
```

#### 2. css/dark-theme.css
Added matching rules in the global dark theme CSS:

```css
[data-bs-theme="dark"] .cert-watermark {
    background: url('assets/img/Seal_of_Angeles_City.png') no-repeat center center !important;
    background-size: contain !important;
    background-color: transparent !important;
    opacity: 0.13 !important;
}
```

## Why This Works

### CSS Specificity
- `#certPreviewContent .cert-watermark` has higher specificity than `.cert-watermark` alone
- Adding `!important` ensures these rules override any conflicting styles
- Explicit path in CSS ensures the image loads even if inline styles fail

### Background vs Background-Color
- Using full `background` property (not just `background-color`) ensures the image URL is set
- `background-color: transparent` ensures no color blocks the image
- Both properties together guarantee the watermark displays

### Multiple Declarations
We declare the watermark in three places:
1. **Inline HTML** - Base declaration in the certificate template
2. **Page CSS** - Override any dark mode interference
3. **Global CSS** - Backup in dark-theme.css

This triple-layer approach ensures the watermark shows no matter what.

## Expected Result

When viewing a certificate, you should now see:

### Visual Appearance
- ✅ **Faint seal/logo** in the center of the certificate
- ✅ **13% opacity** (barely visible, like a watermark should be)
- ✅ **Behind the text** (z-index: 0)
- ✅ **Centered** at 55% from top, 50% from left
- ✅ **420px x 420px** size

### Where to See It
1. Click "View" button on any certificate
2. Look at the center-back area of the document
3. You should see a faint Angeles City seal behind the text

### In Both Modes
- ✅ Light mode - watermark visible
- ✅ Dark mode - watermark visible
- ✅ Print preview - watermark visible
- ✅ Actual print - watermark appears on paper

## Testing Steps

1. **Open certificates page**
2. **Click "View" on any certificate**
3. **Check the document center** - should see faint seal
4. **Toggle dark mode** - seal should still be visible
5. **Click "Print"** - seal should appear in print preview
6. **Check browser console** - no image loading errors

## Troubleshooting

If watermark still doesn't show:

### Check 1: Image File Exists
```
assets/img/Seal_of_Angeles_City.png
```
✅ File confirmed to exist

### Check 2: Image Loads
Open browser DevTools → Network tab → Look for Seal_of_Angeles_City.png
- Should show 200 OK status
- Should not show 404 error

### Check 3: CSS Applied
Open browser DevTools → Elements tab → Inspect `.cert-watermark` div
- Should show background-image in styles
- Should show opacity: 0.13
- Should show position: absolute

### Check 4: Not Hidden
In DevTools, check:
- z-index: 0 (behind text, but still visible)
- opacity: 0.13 (very faint, but present)
- display: block (not hidden)

## Image Info
**File:** `assets/img/Seal_of_Angeles_City.png`
**Type:** PNG (transparent background)
**Usage:** Official seal watermark for certificates
**Opacity:** 13% (0.13) for subtle professional look

The watermark should now be visible! 🏛️✨
