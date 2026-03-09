That is the perfect question, and it exposes exactly why that one-word typo broke the entire feature.

My previous "Wipe and Replace" explanation was slightly simplified. Let's look at the exact mechanics of what happened in your database when you clicked "Save" on a **brand-new project**, and why your typo code completely failed to act.

### The "Smart Replace" Reality

Modern Django doesn't actually do a blind "Wipe" (`post_clear`) every single time. It uses an optimized method called `.set()`.

When you click Save, Django compares the old database list with your new HTML form list and only does what is strictly necessary.

### Why it failed with your typo (`post_save` instead of `post_add`):

**1. The Starting State (Brand New Project)**

You create a new project. The hidden Many-to-Many table has **0 members**.

- **Old List:** `[]`
    
- **Form List:** `[]` (Because you didn't click yourself in the Admin UI).
    

**2. Django calculates the difference**

Django says: _"There's nothing to delete, so I will skip the `clear()` command."_

- **Result:** The `"post_clear"` signal **never fires**.
    

**3. Django executes the Add**

Django says: _"I will now add whatever is in the form."_ (Even if the form is empty, it still passes through the `add()` logic).

- **Result:** The **`"post_add"`** signal fires.
    

**4. Your code was asleep**

Look at your original code with the typo:

Python

```
if action == 'post_save' or action == 'post_clear':
```

Because the list was empty, Django skipped `post_clear`. It went straight to `post_add`. But your code was only listening for `post_save` (which isn't a valid M2M action) and `post_clear` (which didn't happen).

**The Conclusion:** Your signal receiver literally slept through the entire Admin save process. It never woke up to check the list, which is why the creator was never added.

### Why fixing the typo to `post_add` fixed the bug instantly

By changing that line to listen for `post_add`, your code finally woke up at Step 3.

When Django fired the `"post_add"` signal, your code intercepted it, said, _"Wait, the creator isn't in here!"_, and forced the database to add them before finishing the request.

Does that completely clear up the mystery of why the typo broke it, and why `post_add` is the actual heavy lifter here?