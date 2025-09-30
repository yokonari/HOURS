// /types/place.ts
export type Place = {
    id?: string;
    displayName?: { text?: string; languageCode?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    primaryType?: string;
    primaryTypeDisplayName?: { text?: string };
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    websiteUri?: string;
    currentOpeningHours?: {
        openNow?: boolean;
        weekdayDescriptions?: string[];
    };
    photos?: {
        name: string;
        widthPx?: number;
        heightPx?: number;
        authorAttributions?: { displayName?: string; uri?: string }[];
    }[];
};


