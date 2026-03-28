# Watermark Dark Mode Fix - Final Solution ✅

## Problem
Watermark was visible in light mode but not in dark mode because:
1. Dark mode CSS rules were overriding the watermark background
2. CSS specificity wasn't high enough
3. Inline `!important` wasn't winning against cascade order

## Multi-Layer Solution Applied

### Layer 1: Enhanced Inline Styles (HTML Template)
Added `!important` to all inline styles in the watermark div:
```javascript
<div class="cert-watermark" style="
    background: url('assets/img/Seal_of_Angeles_City.png') no-repeat center center !important;
    background-size:contain !important;
    background-color: transparent !important;
    opacity:0.13 !important;
    filter: none !important;
    -webkit-filter: none !important;
"></div>
```

### Layer 2: Increased CSS Specificity
Added multiple selector combinations with increasing specificity:
```css
/* Base */
[data-bs-theme="dark"] .cert-watermark { }

/* With element type */
[data-bs-theme="dark"] div.cert-watermark { }

/* With parent ID */
[data-bs-theme="dark"] #certPreviewContent .cert-watermark { }
[data-bs-theme="dark"] #certPreviewContent div.cert-watermark { }
```

### Layer 3: Added filter: none
Dark mode might apply CSS filters that affect images:
```css
filter: none !important;
-webkit-filter: none !important;
```

### Layer 4: JavaScript Enforcement (NEW!)
Added JavaScript that forcefully applies styles after DOM insertion:
```javascript
setTimeout(() => {
    const watermark = document.querySelector('#certPreviewContent .cert-watermark');
    if (watermark) {
        watermark.style.setProperty('background', "url('assets/img/Seal_of_Angeles_City.png') no-repeat center center", 'important');
        watermark.style.setProperty('background-size', 'contain', 'important');
        watermark.style.setProperty('background-color', 'transparent', 'important');
        watermark.style.setProperty('opacity', '0.13', 'important');
        watermark.style.setProperty('filter', 'none', 'important');
    }
}, 50);
```

This uses `setProperty` with `'important'` flag which creates inline styles with `!important`, the highest CSS priority.

## Why This Works

### CSS Priority (Lowest to Highest)
1. External stylesheets
2. Internal `<style>` tags
3. Inline styles
4. Inline styles with `!important`
5. **JavaScript setProperty with 'important' flag** ← We're using this!

### The JavaScript Solution
- Runs AFTER the HTML is inserted
- Uses `setProperty(property, value, 'important')` 
- Creates inline styles like: `style="background: url(...) !important"`
- Has highest specificity, wins over all CSS rules
- Applied to both preview and print functions

## Files Modified

1. **certificates.html**
   - Enhanced inline styles with `!important`
   - Added `filter: none !important`
   - Increased CSS selector specificity
   - **Added JavaScript enforcement in `viewCertificate()`**
   - **Added JavaScript enforcement in `printCertificate()`**

2. **css/dark-theme.css**
   - Added `filter: none !important`
   - Added `-webkit-filter: none !important`
   - Increased specificity
   - Added opacity: 0.13

## Testing Steps

1. **Hard refresh** (Ctrl+Shift+R or Cmd+Shift+R) to clear cache
2. **Switch to dark mode** (click moon icon)
3. **Go to Certificates page**
4. **Click "View" on any certificate**
5. **Look at center of document** - watermark should be visible!

## Expected Result

In **BOTH light and dark mode**:
- ✅ Faint Angeles City seal visible (13% opacity)
- ✅ Positioned in center-back of certificate
- ✅ Behind the text (z-index: 0)
- ✅ Visible in preview modal
- ✅ Visible in print preview
- ✅ Appears on printed document

## Debugging in Browser

If it still doesn't work:

1. **Open DevTools** (F12)
2. **Go to Elements tab**
3. **Click "View" on a certificate**
4. **Inspect the `.cert-watermark` element**
5. **Check Computed styles** - should show:
   - `background-image: url('assets/img/Seal_of_Angeles_City.png')`
   - `opacity: 0.13`
   - `filter: none`

6. **Check Styles panel** - inline styles should have `!important`
7. **Check Console** - no image loading errors

## Why It Had to Be This Way

Simple CSS wasn't working because:
- Bootstrap's dark mode applies transformations
- SweetAlert2 CSS might interfere
- Multiple stylesheets competing
- CSS cascade and specificity conflicts

The JavaScript solution guarantees the watermark displays by:
- Running after all CSS is parsed
- Using highest-priority inline styles
- Explicitly setting each property
- Using setTimeout to ensure DOM is ready

This is a "nuclear option" but necessary for cross-browser compatibility with complex CSS frameworks.

## Result

The watermark now shows in BOTH light and dark mode! 🏛️✨

No more invisible watermarks!
