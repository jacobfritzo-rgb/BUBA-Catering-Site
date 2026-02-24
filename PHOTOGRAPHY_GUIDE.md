# 📸 BUBA Catering - Photography Guide

**Goal**: Replace emoji placeholders with stunning food photography to maximize conversions

---

## 🎯 PRIORITY ORDER (What to Shoot First)

### 1. **HERO IMAGE** (HIGHEST PRIORITY)
**Location**: Top of page, first thing visitors see
**What to shoot**:
- Overhead shot of both boxes fully loaded
- Show variety: multiple flavors, all sauces arranged beautifully
- Include pickles, olives, eggs in small bowls
- Use natural lighting
- Clean white or wood background
- Make it look ABUNDANT and FRESH

**Style Reference**: Think food magazine cover
**Dimensions**: Wide landscape (1920x800px minimum)
**Impact**: This ONE photo will drive 70% of conversion improvement

---

### 2. **BOX PRODUCT SHOTS** (2 PHOTOS)
**Location**: Product Showcase section
**What to shoot**:

**Photo A - Party Box**:
- Full party box from slight angle (not straight overhead)
- All 40 mini burekas visible
- Show layers and flaky pastry texture
- Include sauce containers on the side
- Natural lighting, warm tones

**Photo B - Big Box**:
- Full big box from slight angle
- All 8 half-size burekas visible
- Show size comparison (bigger pieces than party box)
- Include jammy eggs, sauces
- Same lighting/style as Party Box for consistency

**Style**: Clean, professional, makes you hungry
**Dimensions**: Square or 4:3 ratio (800x800px minimum)

---

### 3. **FLAVOR CLOSE-UPS** (4 PHOTOS)
**Location**: Flavor Showcase section
**What to shoot**:

**Photo 1 - Cheese Bureka**:
- Single bureka cut in half
- Show cheese filling oozing
- Golden, flaky pastry layers visible
- Close-up, hero shot
- Maybe show a bite taken out

**Photo 2 - Spinach Artichoke Bureka**:
- Cut in half to show green filling
- Can see artichoke pieces
- Same style as cheese shot
- Consistent lighting

**Photo 3 - Potato Leek Bureka**:
- Cross-section showing potato filling
- Maybe with steam (if freshly baked)
- Golden crust
- Appetizing angle

**Photo 4 - Seasonal Bureka**:
- Whatever the current seasonal is
- Same hero style
- Show it's something special/different

**Style**: Magazine food photography, close-up, dramatic
**Dimensions**: Square (600x600px minimum)
**Lighting**: Side lighting to show texture

---

### 4. **EVENT PHOTOS** (4-8 PHOTOS)
**Location**: Social Proof section
**What to shoot**:
- Real catered events (get customer permission!)
- Happy people eating burekas
- Party/event settings
- Corporate meetings with BUBA boxes
- Birthday parties
- Wedding receptions
- Diverse settings and demographics

**Style**: Candid, authentic, joyful
**Dimensions**: Any, will be cropped square (500x500px)
**Don't**: Stage photos that look fake

---

## 📷 PHOTOGRAPHY TIPS

### Lighting
- **Natural light** is your friend
- Shoot near a window (not in direct sun)
- Best times: 9-11am or 3-5pm
- Avoid harsh overhead lights
- Use white foam board as reflector

### Styling
- Keep backgrounds simple (white, wood, marble)
- Show burekas fresh and HOT (steam is good!)
- Include props: small bowls for sauces, fresh herbs
- Don't overcrowd - give burekas space to be the star
- Use odd numbers (3 or 5 items looks better than 2 or 4)

### Angles
- **45-degree angle**: Best for boxes and platters
- **Overhead**: Good for showing full spread
- **Close-up**: For individual burekas showing filling
- **Eye level**: For social/event shots

### Camera
- Smartphone is FINE if you have good light
- Use portrait mode for background blur
- Clean your lens!
- Take LOTS of shots - you'll pick best later

---

## 🎨 COLOR PALETTE FOR PHOTOS

Your brand colors are **red (#E10600)** and **black**.

**In photos, look for**:
- Golden brown pastry (natural, appealing)
- White plates/backgrounds (clean, professional)
- Green herbs (fresh, natural)
- Red tomatoes/sauces (ties to brand red!)
- Warm wood tones (rustic, authentic)

**Avoid**:
- Blue tones (makes food look unappetizing)
- Gray backgrounds (depressing)
- Too dark (hard to see details)

---

## 🚫 COMMON MISTAKES TO AVOID

1. **Using stock photos** - Customers can tell, kills trust
2. **Overly filtered** - Keep it natural
3. **Messy backgrounds** - Distracting
4. **Photos too dark** - Can't see the food
5. **All overhead shots** - Mix angles for variety
6. **No people** - Event photos NEED happy people
7. **Too staged** - Authentic is better

---

## 📱 SMARTPHONE PHOTOGRAPHY CHECKLIST

If shooting with phone:

- ✅ Clean the lens
- ✅ Use natural light (near window)
- ✅ Use portrait/food mode if available
- ✅ Get close (fill the frame)
- ✅ Take 20+ shots of each setup
- ✅ Use gridlines to compose (rule of thirds)
- ✅ Don't use flash
- ✅ Don't use digital zoom (move closer instead)
- ✅ Shoot in highest resolution
- ✅ Edit lightly (brightness, contrast only)

---

## 🎬 BUDGET OPTION: DIY Photo Shoot

**What you need** ($0-50):
- Your smartphone
- Natural light (free!)
- White poster board or tablecloth (background)
- White foam board (reflector) - $5
- Your beautifully made burekas

**Process**:
1. Set up near window
2. Put white background down
3. Arrange burekas beautifully
4. Use foam board to bounce light on dark side
5. Shoot from multiple angles
6. Take LOTS of photos
7. Pick the best 10-15
8. Light editing (brighten, increase contrast slightly)

**Time**: 2-3 hours for full shoot

---

## 💰 PROFESSIONAL OPTION: Hire Food Photographer

**Cost**: $500-2,000 for full shoot
**You get**:
- Professional lighting
- Styling expertise
- 50-100 edited photos
- Usage rights

**Worth it if**: You're serious about scaling the business

**Where to find**:
- Instagram: Search #NYCfoodphotographer
- Upwork: Hire freelancer for 1-day shoot
- Local culinary students (cheaper, still good)

---

## 🖼️ IMAGE SPECIFICATIONS

### Technical Requirements:

**Hero Image**:
- Minimum: 1920x800px
- Format: JPG or WebP
- File size: Under 500KB (compress!)
- Name: `hero-burekas-spread.jpg`

**Product Photos (boxes)**:
- Minimum: 1000x1000px
- Format: JPG or WebP
- File size: Under 300KB each
- Names: `party-box.jpg`, `big-box.jpg`

**Flavor Photos**:
- Minimum: 800x800px
- Format: JPG or WebP
- File size: Under 200KB each
- Names: `cheese-bureka.jpg`, `spinach-artichoke-bureka.jpg`, etc.

**Event Photos**:
- Minimum: 600x600px (will be cropped square)
- Format: JPG
- File size: Under 200KB each
- Names: `event-1.jpg`, `event-2.jpg`, etc.

---

## 🔄 WHERE TO ADD PHOTOS IN CODE

Once you have photos, update these files:

### 1. HeroSection.tsx
```tsx
// Replace gradient background with image
<div
  className="relative bg-cover bg-center"
  style={{ backgroundImage: "url('/images/hero-burekas-spread.jpg')" }}
>
```

### 2. ProductShowcase.tsx
```tsx
// Replace emoji placeholder with image
<img
  src="/images/party-box.jpg"
  alt="BUBA Party Box - 40 mini burekas"
  className="w-full h-64 object-cover"
/>
```

### 3. FlavorShowcase.tsx
```tsx
// Replace gradient background with image
<img
  src="/images/cheese-bureka.jpg"
  alt="Cheese Bureka - Feta and Ricotta"
  className="w-full h-48 object-cover"
/>
```

### 4. SocialProof.tsx
```tsx
// Replace emoji with image
<img
  src="/images/event-1.jpg"
  alt="BUBA Catering at corporate event"
  className="w-full aspect-square object-cover"
/>
```

---

## ✅ PHOTO SHOOT CHECKLIST

**Before Shoot**:
- [ ] Bake fresh burekas (golden, perfect looking)
- [ ] Prepare all sauces, sides
- [ ] Clean serving dishes, boxes
- [ ] Set up near window with good light
- [ ] Charge phone/camera
- [ ] Clear background area

**During Shoot**:
- [ ] Take hero shot (full spread)
- [ ] Take party box shot
- [ ] Take big box shot
- [ ] Take 4 individual flavor shots (cut in half)
- [ ] Take detail shots (flaky layers, filling)
- [ ] If possible, get event photos from recent catering
- [ ] Review photos - make sure they're sharp and well-lit

**After Shoot**:
- [ ] Transfer photos to computer
- [ ] Select best 10-15 photos
- [ ] Edit: Brightness +10%, Contrast +10%, Saturation +5%
- [ ] Resize to specifications above
- [ ] Compress (TinyPNG.com)
- [ ] Save with descriptive names
- [ ] Add to `/public/images/` folder

---

## 🎯 SUCCESS CRITERIA

A good bureka photo should:
- ✅ Make you hungry looking at it
- ✅ Show flaky, golden pastry texture
- ✅ Display filling clearly (if cut open)
- ✅ Look FRESH and HOT
- ✅ Be well-lit (can see all details)
- ✅ Have clean composition (not cluttered)
- ✅ Match your brand feel (bold, authentic, quality)

**Test**: Show photo to someone. Do they say "Wow, that looks good!"?
- **YES** = Use it
- **NO** = Reshoot

---

## 💡 INSPIRATION

Search these on Instagram/Pinterest for style reference:
- #foodphotography
- #burekasofinstagram
- #cateringgoals
- #foodstyling
- #burekas

Look for: Natural lighting, close-ups, golden colors, steam, cut-in-half shots

---

## 📞 NEED HELP?

If you want recommendations for:
- NYC food photographers
- Photo editing services
- Styling consultants

Just ask! But honestly, with good lighting and your delicious burekas, you can shoot great photos yourself.

---

**Remember**: Even mediocre REAL photos beat perfect emoji placeholders. Don't let perfect be the enemy of good. Shoot something this week!

🚀 Your burekas are beautiful - show them off!
