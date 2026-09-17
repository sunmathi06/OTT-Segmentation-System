"""
Dataset Generator for OTT Audience Intelligence & Behavioral Segmentation Service.
Generates synthetic but realistic OTT streaming viewer behavioral dataset
with natural clustering archetypes for demonstration and testing.
"""

import os
import numpy as np
import pandas as pd

def generate_ott_dataset(num_records: int = 5000, seed: int = 42, output_path: str = "data/viewers.csv") -> pd.DataFrame:
    np.random.seed(seed)
    
    # Archetype proportions
    # 1. Highly Engaged Action Viewers (~25%)
    # 2. Occasional Family Viewers (~20%)
    # 3. Short-Session Casual Viewers (~25%)
    # 4. Frequent Multi-Genre Viewers (~18%)
    # 5. High-Completion Binge Viewers (~12%)
    
    records = []
    archetypes = [
        ("action_enthusiast", 0.25),
        ("family_occasional", 0.20),
        ("casual_short_session", 0.25),
        ("multi_genre_explorer", 0.18),
        ("binge_completionist", 0.12)
    ]
    
    counts = [int(num_records * p) for _, p in archetypes]
    counts[-1] = num_records - sum(counts[:-1]) # ensure total equals num_records
    
    idx = 1
    devices = ['SmartTV', 'Mobile', 'Tablet', 'Web', 'Console']
    device_weights_by_arch = {
        "action_enthusiast": [0.45, 0.15, 0.10, 0.15, 0.15],
        "family_occasional": [0.60, 0.10, 0.20, 0.05, 0.05],
        "casual_short_session": [0.15, 0.55, 0.20, 0.08, 0.02],
        "multi_genre_explorer": [0.35, 0.25, 0.15, 0.20, 0.05],
        "binge_completionist": [0.55, 0.10, 0.15, 0.15, 0.05]
    }
    
    tiers = ['Free', 'Basic', 'Standard', 'Premium']
    tier_weights_by_arch = {
        "action_enthusiast": [0.05, 0.15, 0.40, 0.40],
        "family_occasional": [0.10, 0.20, 0.40, 0.30],
        "casual_short_session": [0.45, 0.35, 0.15, 0.05],
        "multi_genre_explorer": [0.10, 0.25, 0.40, 0.25],
        "binge_completionist": [0.05, 0.10, 0.35, 0.50]
    }

    for (arch_name, _), count in zip(archetypes, counts):
        for _ in range(count):
            user_id = f"USR_{idx:05d}"
            idx += 1
            
            # Behavioral generation with realistic Gaussian distributions bounded to domain constraints
            if arch_name == "action_enthusiast":
                watch_time = np.clip(np.random.normal(2400, 450), 800, 5000)
                session_duration = np.clip(np.random.normal(55, 12), 25, 120)
                visit_frequency = np.clip(np.random.normal(22, 4), 10, 31)
                number_of_sessions = int(np.clip(watch_time / max(session_duration, 1), 10, 90))
                completion_rate = np.clip(np.random.normal(0.88, 0.06), 0.50, 1.0)
                action_pref = np.clip(np.random.normal(0.78, 0.09), 0.55, 1.0)
                family_pref = np.clip(np.random.normal(0.06, 0.04), 0.0, 0.2)
                comedy_pref = np.clip(np.random.normal(0.10, 0.05), 0.0, 0.3)
                drama_pref = np.clip(1.0 - (action_pref + family_pref + comedy_pref), 0.0, 0.3)
                weekend_ratio = np.clip(np.random.normal(0.42, 0.08), 0.15, 0.8)
                skip_intro_rate = np.clip(np.random.normal(0.85, 0.08), 0.4, 1.0)
                
            elif arch_name == "family_occasional":
                watch_time = np.clip(np.random.normal(950, 250), 300, 2200)
                session_duration = np.clip(np.random.normal(48, 14), 20, 95)
                visit_frequency = np.clip(np.random.normal(8, 2.5), 2, 16)
                number_of_sessions = int(np.clip(watch_time / max(session_duration, 1), 4, 40))
                completion_rate = np.clip(np.random.normal(0.68, 0.11), 0.30, 0.95)
                action_pref = np.clip(np.random.normal(0.08, 0.05), 0.0, 0.25)
                family_pref = np.clip(np.random.normal(0.72, 0.10), 0.45, 0.98)
                comedy_pref = np.clip(np.random.normal(0.14, 0.06), 0.0, 0.35)
                drama_pref = np.clip(1.0 - (action_pref + family_pref + comedy_pref), 0.0, 0.25)
                weekend_ratio = np.clip(np.random.normal(0.68, 0.10), 0.35, 0.95)
                skip_intro_rate = np.clip(np.random.normal(0.42, 0.12), 0.1, 0.8)
                
            elif arch_name == "casual_short_session":
                watch_time = np.clip(np.random.normal(420, 150), 80, 1100)
                session_duration = np.clip(np.random.normal(18, 6), 5, 38)
                visit_frequency = np.clip(np.random.normal(6, 2.8), 1, 15)
                number_of_sessions = int(np.clip(watch_time / max(session_duration, 1), 3, 35))
                completion_rate = np.clip(np.random.normal(0.42, 0.12), 0.15, 0.75)
                action_pref = np.clip(np.random.normal(0.22, 0.08), 0.0, 0.45)
                family_pref = np.clip(np.random.normal(0.12, 0.06), 0.0, 0.3)
                comedy_pref = np.clip(np.random.normal(0.52, 0.11), 0.25, 0.85)
                drama_pref = np.clip(1.0 - (action_pref + family_pref + comedy_pref), 0.0, 0.35)
                weekend_ratio = np.clip(np.random.normal(0.35, 0.12), 0.1, 0.7)
                skip_intro_rate = np.clip(np.random.normal(0.30, 0.15), 0.0, 0.7)
                
            elif arch_name == "multi_genre_explorer":
                watch_time = np.clip(np.random.normal(1650, 380), 600, 3200)
                session_duration = np.clip(np.random.normal(42, 10), 18, 85)
                visit_frequency = np.clip(np.random.normal(18, 3.5), 8, 28)
                number_of_sessions = int(np.clip(watch_time / max(session_duration, 1), 8, 65))
                completion_rate = np.clip(np.random.normal(0.74, 0.08), 0.45, 0.95)
                # balanced across all genres
                action_pref = np.clip(np.random.normal(0.28, 0.06), 0.15, 0.42)
                family_pref = np.clip(np.random.normal(0.22, 0.05), 0.10, 0.38)
                comedy_pref = np.clip(np.random.normal(0.25, 0.05), 0.12, 0.40)
                drama_pref = np.clip(1.0 - (action_pref + family_pref + comedy_pref), 0.10, 0.45)
                weekend_ratio = np.clip(np.random.normal(0.40, 0.09), 0.15, 0.75)
                skip_intro_rate = np.clip(np.random.normal(0.65, 0.12), 0.25, 0.95)
                
            else: # binge_completionist
                watch_time = np.clip(np.random.normal(3100, 520), 1400, 6000)
                session_duration = np.clip(np.random.normal(82, 15), 45, 160)
                visit_frequency = np.clip(np.random.normal(16, 4.0), 6, 26)
                number_of_sessions = int(np.clip(watch_time / max(session_duration, 1), 8, 60))
                completion_rate = np.clip(np.random.normal(0.96, 0.03), 0.85, 1.0)
                action_pref = np.clip(np.random.normal(0.25, 0.07), 0.05, 0.45)
                family_pref = np.clip(np.random.normal(0.08, 0.04), 0.0, 0.2)
                comedy_pref = np.clip(np.random.normal(0.18, 0.06), 0.05, 0.35)
                drama_pref = np.clip(1.0 - (action_pref + family_pref + comedy_pref), 0.35, 0.75)
                weekend_ratio = np.clip(np.random.normal(0.55, 0.10), 0.25, 0.85)
                skip_intro_rate = np.clip(np.random.normal(0.92, 0.05), 0.75, 1.0)
                
            # Normalize genre preferences to strictly sum to 1.0
            g_sum = action_pref + family_pref + comedy_pref + drama_pref
            action_pref = round(float(action_pref / g_sum), 3)
            family_pref = round(float(family_pref / g_sum), 3)
            comedy_pref = round(float(comedy_pref / g_sum), 3)
            drama_pref = round(float(1.0 - (action_pref + family_pref + comedy_pref)), 3)
            
            primary_device = np.random.choice(devices, p=device_weights_by_arch[arch_name])
            subscription_tier = np.random.choice(tiers, p=tier_weights_by_arch[arch_name])
            
            records.append({
                "user_id": user_id,
                "watch_time": round(float(watch_time), 1),
                "session_duration": round(float(session_duration), 1),
                "visit_frequency": int(visit_frequency),
                "completion_rate": round(float(completion_rate), 3),
                "number_of_sessions": int(number_of_sessions),
                "action_preference": action_pref,
                "family_preference": family_pref,
                "comedy_preference": comedy_pref,
                "drama_preference": drama_pref,
                "primary_device": primary_device,
                "subscription_tier": subscription_tier,
                "weekend_watch_ratio": round(float(weekend_ratio), 3),
                "skip_intro_rate": round(float(skip_intro_rate), 3)
            })
            
    df = pd.DataFrame(records)
    # Shuffle records so archetypes are not ordered
    df = df.sample(frac=1.0, random_state=seed).reset_index(drop=True)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Dataset generated with {len(df)} rows saved to {output_path}")
    return df

if __name__ == "__main__":
    generate_ott_dataset()
