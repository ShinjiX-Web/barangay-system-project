# Certificate Display Fixes - Complete ✅

## Issues Fixed

### 1. Invisible Text in Dark Mode (Line 205)
**Problem:** The `text-primary` class on stat cards was set to `#1a1d23` (very dark) in dark mode, making it invisible against dark backgrounds.

**Solution:** Changed `text-primary` color in dark mode from `#1a1d23` to `#4e9cdf` (bright blue).

**Location:** `css/dark-theme.css`
```css
[data-bs-theme="dark"] .text-primary {
    color: #4e9cdf !important;  /* Changed from #1a1d23 */
}
```

**Affected Elements:**
- "Pending" stat card label
- Other elements using `text-primary` class throughout the app

---

### 2. Missing Watermark/Logo in Certificate

**Problem:** The CSS rules forcing white background were using `background: #fff !important` which overrode the watermark's `background-image` property.

**Solutions Implemented:**

#### A. Added Class to Watermark
Added `cert-watermark` class to the watermark div in the certificate template:
```html
<div class="cert-watermark" style="
    position:absolute;
    background: url('assets/img/Seal_of_Angeles_City.png') no-repeat center center;
    opacity:0.13;
    ...
"></div>
```

#### B. Updated CSS to Exclude Watermark
Changed from using wildcard selector to excluding `.cert-watermark`:

**Before:**
```css
#certPreviewContent * {
    background: #fff !important;  /* Kills watermark! */
}
```

**After:**
```css
#certPreviewContent *:not(.cert-watermark) {
    background-color: #fff !important;  /* Uses background-color, not background */
}

.cert-watermark {
    background-color: transparent !important;  /* Preserve background-image */
}
```

#### C. Updated Print Styles
Added watermark preservation in print media query:
```css
@media print {
    .cert-print-area *:not(.cert-watermark) {
        background-color: #fff !important;
    }
    
    .cert-watermark {
        background-color: transparent !important;
        opacity: 0.13 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
}
```

---

## Files Modified

1. **css/dark-theme.css**
   - Fixed `text-primary` color for dark mode visibility
   - Added watermark exclusion rules
   - Updated print media query to preserve watermark

2. **certificates.html**
   - Added `cert-watermark` class to watermark div
   - Updated inline CSS to exclude watermark from background overrides
   - Added watermark preservation in print styles

---

## Technical Details

### Why `background-color` instead of `background`?
- `background` is a shorthand that resets ALL background properties including `background-image`
- `background-color` only sets the color, leaving `background-image` intact
- This allows the watermark's image to remain visible while the rest gets white background

### CSS Specificity
Used `:not(.cert-watermark)` pseudo-class selector to exclude watermark from blanket rules:
```css
#certPreviewContent *:not(.cert-watermark)
```
This matches all descendants EXCEPT those with `cert-watermark` class.

### Print Color Adjustment
Added these properties to ensure watermark prints correctly:
```css
-webkit-print-color-adjust: exact;
print-color-adjust: exact;
```
Forces browsers to print backgrounds/images exactly as specified.

---

## Testing Checklist

### Light Mode
- [x] Line 205 "Pending" text visible (blue)
- [x] Certificate preview shows watermark (faint seal)
- [x] Certificate prints with watermark

### Dark Mode
- [x] Line 205 "Pending" text visible (bright blue)
- [x] Other text-primary elements visible
- [x] Certificate preview on white background
- [x] Certificate preview shows watermark (faint seal)
- [x] Certificate prints with white background
- [x] Certificate prints with watermark visible
- [x] QR code renders correctly

### Watermark Visibility
The watermark should appear as:
- Faint seal/logo in the center-back of the certificate
- Opacity: 0.13 (13% visible, 87% transparent)
- Behind the text content (z-index: 0)
- Visible in both preview and print

---

## Result

✅ **Text-primary class** now uses bright blue (`#4e9cdf`) in dark mode - visible on dark backgrounds
✅ **Certificate watermark** preserved in both preview and print
✅ **Print output** maintains white background with visible watermark
✅ **All certificate types** display correctly with proper branding

Official documents now look professional with the barangay seal watermark visible! 🏛️✨
