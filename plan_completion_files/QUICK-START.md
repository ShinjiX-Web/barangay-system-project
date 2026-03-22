# 🚀 QUICK START GUIDE - Barangay 14 Management System

## 1. START THE SERVER

```powershell
cd C:\Users\npana\Downloads\site_testing
python -m http.server 8000
```

Then open browser to: **http://localhost:8000/login.html**

---

## 2. LOGIN

**Default Admin Account:**
- Email: `admin@brgy14.gov.ph`
- Password: `admin123`

---

## 3. TESTING WORKFLOW

### Test 1: Register a Resident
1. Click **Dashboard** → Navigate to **Residents** (sidebar)
2. Click **"Register New Resident"** button
3. Fill in form:
   - First Name: `Juan`
   - Middle Name: `Santos`
   - Last Name: `Dela Cruz`
   - Gender: `Male`
   - Date of Birth: `1990-01-15` (Age auto-calculates)
   - Civil Status: `Married`
   - Address: `123 Main St, Zone 2, Barangay 14`
   - Contact: `09171234567`
   - Email: `juan.delacruz@email.com`
   - Photo: Upload or skip
4. Click **"Save Resident"**
5. ✅ Should see success message and resident in table

### Test 2: Request a Certificate
1. Navigate to **Certificates** (sidebar)
2. Click **"New Certificate Request"** tab
3. Fill in form:
   - Select Resident: `Juan Dela Cruz`
   - Certificate Type: `Barangay Clearance`
   - Purpose: `Employment requirement`
4. Click **"Submit Request"**
5. ✅ Should see success and new queue number

### Test 3: Process Certificate
1. In Certificates page, find the request
2. Click **"Process"** button
   - Status changes to "Processing" (yellow)
3. Click **"Complete"** button
   - Status changes to "Completed" (green)
4. Click **"Print"** button
   - Certificate opens in print dialog
5. ✅ Official certificate should display

### Test 4: View Dashboard
1. Navigate to **Dashboard**
2. ✅ Check statistics cards:
   - Total Staff: Should show count
   - Total Residents: Should show 1+
   - Certificates Today: Should show count
   - Pending Requests: Should update
3. ✅ Recent Certificates table shows recent requests
4. ✅ Certificate Statistics shows distribution

---

## 4. QUICK ACTIONS

| Action | Location | Button |
|--------|----------|--------|
| Register Resident | Dashboard → Residents | "Register New Resident" |
| Request Certificate | Dashboard → Certificates | "New Certificate Request" |
| View Queue | Certificates Page | Queue Display Tab |
| Print Certificate | Certificates Page | "Print" button |
| Backup Data | Dashboard | Quick Actions → "Backup Database" |
| Logout | Top Right | User dropdown → Logout |

---

## 5. PAGE NAVIGATION

```
login.html (Landing Page)
    ↓ Login
index.html (Dashboard)
    ├── Residents (residents.html)
    │   ├── Register New
    │   ├── View Directory
    │   ├── Edit
    │   └── Delete
    ├── Certificates (certificates.html)
    │   ├── Queue Display
    │   ├── Request Form
    │   ├── Process
    │   ├── Complete
    │   └── Print
    ├── Staff (table.html)
    │   └── Staff Directory
    └── Profile (profile.html)
        ├── View Profile
        ├── Change Photo
        └── Activity Logs
```

---

## 6. CERTIFICATE TYPES

| Type | Certificate Number | Purpose |
|------|-------------------|---------|
| Barangay Clearance | BC-2026-XXXXXX | General clearance |
| Residency | RC-2026-XXXXXX | Proof of residence |
| Indigency | IC-2026-XXXXXX | Financial assistance |
| Job Seeker | JSC-2026-XXXXXX | First-time job seeker |

---

## 7. STATUS WORKFLOW

```
Certificate Request Flow:
Pending (Blue) → Processing (Yellow) → Completed (Green)

Actions per status:
- Pending: Can "Process" or "Delete"
- Processing: Can "Complete" or "Cancel"
- Completed: Can "Print" or "View"
```

---

## 8. DATA STORAGE

All data stored in **browser localStorage**:
- `users` - Staff accounts
- `residents` - Registered residents
- `certificates` - Certificate requests
- `activityLogs` - System activity
- `userSession` - Current session

**To Clear Data:** Open browser console and run:
```javascript
localStorage.clear();
location.reload();
```

**To Backup Data:** Click "Backup Database" in Quick Actions

---

## 9. TROUBLESHOOTING

### Issue: "Not logged in" error
**Fix:** Clear localStorage and login again

### Issue: Dashboard shows 0 residents
**Fix:** Register at least one resident first

### Issue: Can't request certificate
**Fix:** Make sure resident is registered first

### Issue: Print doesn't work
**Fix:** Check browser print settings, allow popups

### Issue: Photo won't upload
**Fix:** Use JPG/PNG, max recommended size 1MB

---

## 10. KEYBOARD SHORTCUTS

| Key | Action |
|-----|--------|
| Ctrl+S | Save form (if in input) |
| Esc | Close modals |
| Tab | Navigate form fields |
| Enter | Submit form |

---

## 11. TEST DATA SAMPLES

### Sample Resident 1:
- Name: Maria Santos Garcia
- Gender: Female
- DOB: 1985-05-20
- Status: Single
- Address: 456 Rizal Ave, Zone 2
- Contact: 09181234567

### Sample Resident 2:
- Name: Pedro Antonio Reyes
- Gender: Male
- DOB: 1978-11-10
- Status: Married
- Address: 789 Bonifacio St, Zone 2
- Contact: 09191234567

### Sample Resident 3:
- Name: Rosa Luna Martinez
- Gender: Female
- DOB: 1995-03-15
- Status: Married
- Address: 321 Mabini St, Zone 2
- Contact: 09201234567

---

## 12. VALIDATION RULES

### Resident Registration:
- ✓ First Name, Last Name: Required
- ✓ Gender: Required (Male/Female/Other)
- ✓ Date of Birth: Required, must be past date
- ✓ Contact: Optional, but recommended
- ✓ Photo: Optional, JPG/PNG preferred

### Certificate Request:
- ✓ Resident: Must be selected
- ✓ Certificate Type: Required
- ✓ Purpose: Required (min 10 characters)

---

## 13. ADMIN FUNCTIONS

✅ Available in Dashboard:
1. **Backup Database** - Download JSON file
2. **View All Staff** - table.html
3. **Activity Logs** - profile.html
4. **Manage Residents** - Full CRUD
5. **Process Certificates** - Full workflow

---

## 14. SUCCESS INDICATORS

After each action, look for:
- ✅ Green success message (SweetAlert)
- ✅ Table updates with new data
- ✅ Dashboard statistics update
- ✅ Status badge color changes
- ✅ Queue numbers assigned

---

## 15. BEST PRACTICES

1. **Always register residents first** before requesting certificates
2. **Use unique email addresses** for each resident
3. **Process certificates in queue order** (FIFO)
4. **Backup data regularly** (weekly recommended)
5. **Test print function** before going live
6. **Verify resident details** before approving certificates
7. **Use proper certificate type** for each request
8. **Complete status workflow** (don't skip steps)

---

## 🎯 READY TO GO!

The system is complete and ready for use.  
Start with registering residents, then test the certificate workflow.

**Remember:** Data is stored locally in your browser.  
Backup regularly and don't clear browser data!

---

**For detailed documentation, see:** `COMPLETION-REPORT.md`  
**For implementation details, see:** `plan.md`
