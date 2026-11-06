import { tr } from "@/lib/i18n-options";

const zone = (value: string, family: "WET" | "CET" | "EET", city: string) => ({
    value,
    get label(): string {
        return `${tr(`settings:timezones.${family}`)} - ${tr(`settings:cities.${city}`, { defaultValue: city })}`;
    },
});

export const TimezoneOptions = [
    zone("Europe/Dublin", "WET", "Dublin"),
    zone("Europe/Lisbon", "WET", "Lisbon"),
    zone("Europe/Paris", "CET", "Paris"),
    zone("Europe/Berlin", "CET", "Berlin"),
    zone("Europe/Rome", "CET", "Rome"),
    zone("Europe/Madrid", "CET", "Madrid"),
    zone("Europe/Amsterdam", "CET", "Amsterdam"),
    zone("Europe/Stockholm", "CET", "Stockholm"),
    zone("Europe/Vienna", "CET", "Vienna"),
    zone("Europe/Prague", "CET", "Prague"),
    zone("Europe/Warsaw", "CET", "Warsaw"),
    zone("Europe/Brussels", "CET", "Brussels"),
    zone("Europe/Zagreb", "CET", "Zagreb"),
    zone("Europe/Copenhagen", "CET", "Copenhagen"),
    zone("Europe/Budapest", "CET", "Budapest"),
    zone("Europe/Luxembourg", "CET", "Luxembourg"),
    zone("Europe/Malta", "CET", "Malta"),
    zone("Europe/Bratislava", "CET", "Bratislava"),
    zone("Europe/Ljubljana", "CET", "Ljubljana"),
    zone("Europe/Sofia", "EET", "Sofia"),
    zone("Asia/Nicosia", "EET", "Nicosia"),
    zone("Europe/Tallinn", "EET", "Tallinn"),
    zone("Europe/Helsinki", "EET", "Helsinki"),
    zone("Europe/Athens", "EET", "Athens"),
    zone("Europe/Riga", "EET", "Riga"),
    zone("Europe/Vilnius", "EET", "Vilnius"),
    zone("Europe/Bucharest", "EET", "Bucharest"),
];
