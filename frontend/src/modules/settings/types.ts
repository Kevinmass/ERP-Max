// Settings data structure
export interface Settings {
    company_name: string;
    business_address?: string;
    business_city?: string;
    business_phone?: string;
    business_email?: string;
    business_website?: string;
    theme_variant: 'light' | 'dark';
    density: 'comodo' | 'compacto';
    font_size: 'small' | 'medium' | 'large';
    tax_rate: number;
}

// API response types
export type SettingsMap = Record<string, string>;
