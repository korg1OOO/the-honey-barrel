# Matching Algorithm Documentation

The Honey Barrel extension uses a scoring-based matching algorithm to compare scraped bottle information with BAXUS marketplace listings. The algorithm is designed to handle variations in naming conventions, limited editions, rare bottles, and special packages.

## Steps
1. **Normalization**:
   - Convert names to lowercase.
   - Remove special characters and extra spaces.
   - Standardize terms (e.g., "year" → "y", "amer" → "american", "whisky" → "whiskey", "single malt" → "sm").

2. **Core Term Extraction**:
   - Extract significant terms (length > 3) from the normalized name to focus on key identifiers (e.g., "david james american whiskey 10y" → ["david", "james", "american", "whiskey"]).

3. **Scoring**:
   - **Spirit Type Match**: +10 points if spirit types match (e.g., "American Whiskey" matches "American Whiskey").
   - **Core Terms Match**: If all core terms from the scraped name are present in the BAXUS name, proceed; otherwise, skip.
   - **Name Similarity**: Calculate similarity as the ratio of matching core terms to total unique terms, weighted by 2.
   - **Special Descriptors**: +20 points if both bottles have special descriptors (e.g., "Limited Edition"); -10 if mismatched.
   - **Size Match**: +20 points for exact match, +2 for approximate match (within 500ml), +5 if size is unavailable.
   - **ABV Match**: +5 points for exact match (within 0.1%), +5 if scraped ABV is "N/A" and BAXUS ABV is 40%, +2 if unavailable.
   - **Age Match**: +15 points if ages match.
   - **Vintage/Cask Number Match**: +10 points each if vintage or cask number matches (for rare bottles).

4. **Confidence Score**:
   - Calculated as a weighted sum of matches:
     - Spirit type: 20%
     - Name similarity: 50%
     - Special descriptors: 20%
     - Size: 15%
     - ABV: 10%
     - Age: 15%
     - Vintage/Cask: 10% each
   - Capped at 100%.

5. **Selection**:
   - The listing with the highest score above 40 is selected.
   - The confidence score is displayed in the popup.

## Edge Cases
- **Limited Editions**: Special descriptors increase the score for matches.
- **Rare Bottles**: Vintage and cask number matching helps identify rare bottles.
- **Missing Data**: Fallbacks (e.g., default ABV of 40%) ensure matching isn’t overly strict.
- **Low Confidence**: A fallback search with broader terms improves matching accuracy.