export interface PersonName {
  firstName: string;
  lastName: string | null;
}

/** "Alex Rivera", or just "Alex" when no last name was given. */
export function fullName(person: PersonName): string {
  return [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
}

/** "Rivera, Alex" — for rosters and anywhere sorted by last name. */
export function lastNameFirst(person: PersonName): string {
  return person.lastName ? `${person.lastName}, ${person.firstName}` : person.firstName;
}

export function initialsOf(person: PersonName): string {
  const first = person.firstName.trim()[0] ?? "?";
  const last = person.lastName?.trim()[0];
  return (last ? `${first}${last}` : person.firstName.trim().slice(0, 2)).toUpperCase();
}
