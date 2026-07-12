//! Product name matching.
//!
//! This replaces the earlier hash-based pseudo-embedding with deterministic
//! fuzzy string matching tuned for short product names. Names are the primary
//! signal (supplier and internal names are often similar-but-not-identical), so
//! the score blends:
//!   * per-token best-match similarity (normalized Levenshtein) — tolerant of
//!     word reordering, typos, and singular/plural differences, and
//!   * whole-string character-trigram overlap (Sørensen–Dice) — a smoother that
//!     rewards overall spelling similarity.
//!
//! The result is a 0.0–1.0 score, surfaced to the user as a percentage. The
//! engine only *suggests*; the user always makes the final confirm/reject call.

use crate::modules::product_matching::models::ProductoInterno;
use std::collections::HashSet;

/// Matches supplier product names against internal product names.
pub struct NameMatcher {
    #[allow(dead_code)]
    is_initialized: bool,
}

impl NameMatcher {
    /// Create a new matcher.
    pub fn new() -> Self {
        Self { is_initialized: false }
    }

    /// Kept for startup compatibility; name matching needs no async setup.
    pub async fn initialize(&mut self) -> Result<(), String> {
        self.is_initialized = true;
        println!("Name matcher initialized (fuzzy string matching)");
        Ok(())
    }

    /// Similarity between two product names, in [0.0, 1.0].
    pub fn similarity(&self, a: &str, b: &str) -> f64 {
        name_similarity(a, b)
    }
}

impl Default for NameMatcher {
    fn default() -> Self {
        Self::new()
    }
}

/// Does the supplier code clearly appear on our side (as a whole token in the
/// internal product's name or tags)? Used only as a light boost, never required.
/// Short codes are ignored to avoid coincidental matches.
pub fn code_matches(code: &str, internal: &ProductoInterno) -> bool {
    let code_n = normalize_text(code);
    if code_n.chars().count() < 4 {
        return false;
    }
    let tags = internal.tags.as_deref().unwrap_or("");
    let haystack = format!("{} {}", normalize_text(&internal.nombre), normalize_text(tags));
    haystack.split_whitespace().any(|tok| tok == code_n)
}

/// Blended name similarity in [0.0, 1.0].
fn name_similarity(a: &str, b: &str) -> f64 {
    let na = normalize_text(a);
    let nb = normalize_text(b);

    if na.is_empty() || nb.is_empty() {
        return 0.0;
    }
    if na == nb {
        return 1.0;
    }

    let token = token_ratio(&na, &nb);
    let score = match trigram_dice(&na, &nb) {
        Some(tri) => 0.7 * token + 0.3 * tri,
        None => token, // strings too short for trigrams — trust the token score
    };
    score.clamp(0.0, 1.0)
}

/// Symmetric per-token best-match ratio: for each token on each side, find its
/// best-matching token on the other side, then average. Rewards exact token
/// overlap (sim 1.0) while tolerating typos and reordering.
fn token_ratio(a: &str, b: &str) -> f64 {
    let at: Vec<&str> = a.split_whitespace().collect();
    let bt: Vec<&str> = b.split_whitespace().collect();
    if at.is_empty() || bt.is_empty() {
        return 0.0;
    }

    let sum_a: f64 = at
        .iter()
        .map(|ta| bt.iter().map(|tb| token_sim(ta, tb)).fold(0.0, f64::max))
        .sum();
    let sum_b: f64 = bt
        .iter()
        .map(|tb| at.iter().map(|ta| token_sim(ta, tb)).fold(0.0, f64::max))
        .sum();

    (sum_a / at.len() as f64 + sum_b / bt.len() as f64) / 2.0
}

/// Normalized Levenshtein similarity between two tokens, in [0.0, 1.0].
fn token_sim(a: &str, b: &str) -> f64 {
    if a == b {
        return 1.0;
    }
    let max = a.chars().count().max(b.chars().count());
    if max == 0 {
        return 1.0;
    }
    1.0 - (levenshtein(a, b) as f64 / max as f64)
}

/// Iterative Levenshtein edit distance over Unicode scalar values.
fn levenshtein(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    if a.is_empty() {
        return b.len();
    }
    if b.is_empty() {
        return a.len();
    }

    let mut prev: Vec<usize> = (0..=b.len()).collect();
    let mut curr: Vec<usize> = vec![0; b.len() + 1];

    for (i, ca) in a.iter().enumerate() {
        curr[0] = i + 1;
        for (j, cb) in b.iter().enumerate() {
            let cost = if ca == cb { 0 } else { 1 };
            curr[j + 1] = (prev[j + 1] + 1)      // deletion
                .min(curr[j] + 1)                // insertion
                .min(prev[j] + cost);            // substitution
        }
        std::mem::swap(&mut prev, &mut curr);
    }

    prev[b.len()]
}

/// Sørensen–Dice coefficient over character trigrams of the whole string.
/// Returns None when either string is too short to form a trigram.
fn trigram_dice(a: &str, b: &str) -> Option<f64> {
    let ta = trigrams(a);
    let tb = trigrams(b);
    if ta.is_empty() || tb.is_empty() {
        return None;
    }
    let intersection = ta.intersection(&tb).count();
    Some((2.0 * intersection as f64) / (ta.len() + tb.len()) as f64)
}

fn trigrams(s: &str) -> HashSet<[char; 3]> {
    let chars: Vec<char> = s.chars().collect();
    let mut set = HashSet::new();
    if chars.len() < 3 {
        return set;
    }
    for w in chars.windows(3) {
        set.insert([w[0], w[1], w[2]]);
    }
    set
}

/// Normalize text for matching: lowercase, strip Spanish accents, drop special
/// characters, collapse whitespace.
fn normalize_text(text: &str) -> String {
    let mut result = text.to_lowercase();

    result = result
        .replace('á', "a")
        .replace('é', "e")
        .replace('í', "i")
        .replace('ó', "o")
        .replace('ú', "u")
        .replace('ü', "u")
        .replace('ñ', "n");

    result = result
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { ' ' })
        .collect();

    result.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sim(a: &str, b: &str) -> f64 {
        NameMatcher::new().similarity(a, b)
    }

    #[test]
    fn identical_names_score_one() {
        assert!((sim("Tornillo galvanizado", "Tornillo galvanizado") - 1.0).abs() < 1e-9);
    }

    #[test]
    fn accents_and_case_are_ignored() {
        assert!((sim("Martillo Carpintería", "martillo carpinteria") - 1.0).abs() < 1e-9);
    }

    #[test]
    fn reordered_tokens_score_high() {
        assert!(sim("Tornillo 3/4 galvanizado", "galvanizado tornillo 3/4") > 0.9);
    }

    #[test]
    fn minor_typo_still_matches_well() {
        // "phillips" vs "philips" — a single-token typo should stay high.
        assert!(sim("Destornillador Phillips", "Destornillador Philips") > 0.85);
    }

    #[test]
    fn unrelated_names_score_low() {
        assert!(sim("Tornillo galvanizado", "Pintura blanca 4 litros") < 0.4);
    }

    #[test]
    fn partial_overlap_scores_in_between() {
        let s = sim("Cable unipolar 2.5mm", "Cable unipolar 4mm");
        assert!(s > 0.5 && s < 0.95, "got {}", s);
    }
}
