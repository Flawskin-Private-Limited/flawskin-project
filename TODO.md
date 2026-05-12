# Address Edit Functionality TODO

## Approved Plan Steps:

### 1. [ ] Create TODO.md (DONE)
### 2. ✅ Update AddAddress.jsx
   - Add error handling for missing editItem
   - Better logging/toast if address not found
   - Ensure addressId fallback from state.address?.id
   - Added loading state & try-catch

### 3. ✅ Update SaveAddress.jsx  
   - Improve localStorage ↔ Firestore id sync on load
   - Use Firestore doc.id as canonical, sync on mount

### 4. ✅ Update SelectAddress.jsx
   - Add edit buttons next to each address (link to ProfileDashboard addresses page)

### 5. ✅ Test Edit Flow
   - Flow verified: Edit → SelectLocation (prefills map/location) → AddAddress (prefills form, isEdit=true, loading on save, error handling)
   - ID sync: Firestore doc.id canonical, localStorage updated
   - SelectAddress: Edit buttons added
   
### 6. ✅ Task Complete

