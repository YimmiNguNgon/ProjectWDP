// Vietnam provinces, districts and wards API integration
export interface Province {
    code: string;
    name: string;
}

export interface District {
    code: string;
    name: string;
    province_code: string;
}

export interface Ward {
    code: string;
    name: string;
    district_code: string;
}

// API base URL
const API_BASE = "https://provinces.open-api.vn/api";

// Fetch all provinces
export const fetchProvinces = async (): Promise<Province[]> => {
    try {
        const response = await fetch(`${API_BASE}/p/`);
        const data = await response.json();
        return data.map((p: any) => ({
            code: p.code.toString(),
            name: p.name,
        }));
    } catch (error) {
        console.error("Failed to fetch provinces:", error);
        return [];
    }
};

// Fetch districts for a specific province
export const fetchDistrictsByProvince = async (
    provinceCode: string
): Promise<District[]> => {
    try {
        const response = await fetch(`${API_BASE}/p/${provinceCode}?depth=2`);
        const data = await response.json();
        return (data.districts || []).map((d: any) => ({
            code: d.code.toString(),
            name: d.name,
            province_code: provinceCode,
        }));
    } catch (error) {
        console.error("Failed to fetch districts:", error);
        return [];
    }
};

// Fetch wards for a specific district
export const fetchWardsByDistrict = async (
    districtCode: string
): Promise<Ward[]> => {
    try {
        const response = await fetch(`${API_BASE}/d/${districtCode}?depth=2`);
        const data = await response.json();
        return (data.wards || []).map((w: any) => ({
            code: w.code.toString(),
            name: w.name,
            district_code: districtCode,
        }));
    } catch (error) {
        console.error("Failed to fetch wards:", error);
        return [];
    }
};

// Helpers to find codes by name (useful for initial load if data saved as names)
export const findProvinceCodeByName = (provinces: Province[], name: string): string | undefined => {
    return provinces.find(p => p.name === name)?.code;
}

export const findDistrictCodeByName = (districts: District[], name: string): string | undefined => {
    return districts.find(d => d.name === name)?.code;
}
