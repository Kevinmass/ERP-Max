// Settings data structure
export interface Settings {
    company_name: string;
    business_address?: string;
    business_city?: string;
    business_phone?: string;
    business_email?: string;
    business_website?: string;
    theme_name: 'blue' | 'green' | 'purple' | 'professional';
    theme_variant: 'light' | 'dark';
    font_size: 'small' | 'medium' | 'large';
    language: 'en' | 'es';
    tax_rate: number;
}

// API response types
export type SettingsMap = Record<string, string>;
