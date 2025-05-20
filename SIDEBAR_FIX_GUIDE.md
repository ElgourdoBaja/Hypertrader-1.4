# Fixing the Sidebar Layout Issue

There's a layout issue where the sidebar is overlapping with the main content, making it difficult to see the names of coins being traded. This guide will help you fix this issue.

## Option 1: Apply the Changes Manually

You need to make two simple changes to the codebase:

### 1. Edit `frontend/src/App.js`:

Find this line (around line 133):
```jsx
<div className="flex flex-col flex-1 overflow-hidden">
```

Replace it with:
```jsx
<div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
```

### 2. Edit `frontend/src/components/common/Sidebar.js`:

Find this line (around line 21):
```jsx
<aside className={`bg-gray-800 text-white transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'} h-screen overflow-y-auto fixed left-0 top-0 shadow-lg z-10`}>
```

Replace it with:
```jsx
<aside className={`bg-gray-800 text-white transition-all duration-300 ${isOpen ? 'w-64' : 'w-20'} h-screen overflow-y-auto fixed left-0 top-0 shadow-lg`}>
```

## Option 2: Apply the Patch File

If you're comfortable with Git, you can apply the patch file:

1. Save the `sidebar-layout-fix.patch` file to your computer
2. Open a Command Prompt in your project directory
3. Run: `git apply sidebar-layout-fix.patch`

## What This Fix Does

1. Adds a left margin to the main content that adjusts based on the sidebar width
2. Removes the high z-index from the sidebar that was causing it to overlap

After making these changes, restart the application and you should see the full names of the cryptocurrencies without any overlap issues.