import type { DiscoveryAction, DiscoveryState, MangaDiscoverySort } from "./search.types";

export function discoveryReducer(state: DiscoveryState, action: DiscoveryAction): DiscoveryState {
  switch (action.type) {
    case "queryChanged":
      return { ...state, query: action.value };
    case "includedTagToggled":
      return {
        ...state,
        includedTags: toggleListValue(state.includedTags, action.value),
        excludedTags: state.excludedTags.filter((item) => item !== action.value)
      };
    case "excludedTagToggled":
      return {
        ...state,
        excludedTags: toggleListValue(state.excludedTags, action.value),
        includedTags: state.includedTags.filter((item) => item !== action.value)
      };
    case "contentRatingToggled":
      return { ...state, contentRating: toggleRequiredListValue(state.contentRating, action.value) };
    case "statusToggled":
      return { ...state, status: toggleListValue(state.status, action.value) };
    case "yearChanged":
      return { ...state, year: action.value };
    case "authorChanged":
      return { ...state, author: action.value };
    case "artistChanged":
      return { ...state, artist: action.value };
    case "sortChanged":
      return { ...state, sort: action.value };
    case "cleared":
      return createDiscoveryState(action.routeGenre, action.defaultSort);
    default:
      return state;
  }
}

export function createDiscoveryState(routeGenre: string, defaultSort: MangaDiscoverySort): DiscoveryState {
  return {
    query: "",
    includedTags: routeGenre ? [routeGenre] : [],
    excludedTags: [],
    contentRating: ["safe", "suggestive"],
    status: [],
    year: "",
    author: "",
    artist: "",
    sort: defaultSort
  };
}

function toggleListValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function toggleRequiredListValue<T extends string>(values: T[], value: T) {
  if (!values.includes(value)) return [...values, value];
  if (values.length === 1) return values;
  return values.filter((item) => item !== value);
}
