import { FieldDiff, DataPreview } from '@/components/mod/field-diff';
import type { CurrentValues } from '@/server/lib/submission-fields';
import type {
  ReciterSubmissionData,
  AlbumSubmissionData,
  TrackSubmissionData,
  SubmissionDTO,
} from '@nawhas/types';

// ---------------------------------------------------------------------------
// Shared presentational component — renders the field-by-field diff or
// preview for a submission.  Used by both the moderator detail page
// (/mod/submissions/[id]) and the contributor detail page
// (/profile/contributions/[id]).
// ---------------------------------------------------------------------------

interface SubmissionFieldsProps {
  submission: SubmissionDTO;
  currentValues: CurrentValues | null;
  /** A bound translation function for the `mod.submission` namespace. */
  t: (key: string) => string;
}

export function SubmissionFields({
  submission,
  currentValues,
  t,
}: SubmissionFieldsProps): React.JSX.Element {
  const isEdit = submission.action === 'edit' && currentValues !== null;

  if (submission.type === 'reciter') {
    const data = submission.data as ReciterSubmissionData;
    if (isEdit) {
      return (
        <>
          <FieldDiff label={t('fieldNameLabel')} current={currentValues!.name} proposed={data.name} />
          <FieldDiff label={t('fieldSlugLabel')} current={currentValues!.slug} proposed={data.slug} />
          <FieldDiff label={t('fieldArabicNameLabel')} current={currentValues!.arabicName} proposed={data.arabicName} />
          <FieldDiff label={t('fieldCountryLabel')} current={currentValues!.country} proposed={data.country} />
          <FieldDiff label={t('fieldBirthYearLabel')} current={currentValues!.birthYear} proposed={data.birthYear} />
          <FieldDiff label={t('fieldDescriptionLabel')} current={currentValues!.description} proposed={data.description} />
          <FieldDiff label={t('fieldAvatarUrlLabel')} current={currentValues!.avatarUrl} proposed={data.avatarUrl} />
        </>
      );
    }
    return (
      <>
        <DataPreview label={t('fieldNameLabel')} value={data.name} />
        <DataPreview label={t('fieldSlugLabel')} value={data.slug} />
        <DataPreview label={t('fieldArabicNameLabel')} value={data.arabicName} />
        <DataPreview label={t('fieldCountryLabel')} value={data.country} />
        <DataPreview label={t('fieldBirthYearLabel')} value={data.birthYear} />
        <DataPreview label={t('fieldDescriptionLabel')} value={data.description} />
        <DataPreview label={t('fieldAvatarUrlLabel')} value={data.avatarUrl} />
      </>
    );
  }

  if (submission.type === 'album') {
    const data = submission.data as AlbumSubmissionData;
    if (isEdit) {
      return (
        <>
          <FieldDiff label={t('fieldTitleLabel')} current={currentValues!.title} proposed={data.title} />
          <FieldDiff label={t('fieldSlugLabel')} current={currentValues!.slug} proposed={data.slug} />
          <FieldDiff label={t('fieldReciterIdLabel')} current={currentValues!.reciterId} proposed={data.reciterId} />
          <FieldDiff label={t('fieldYearLabel')} current={currentValues!.year} proposed={data.year} />
          <FieldDiff label={t('fieldArtworkUrlLabel')} current={currentValues!.artworkUrl} proposed={data.artworkUrl} />
          <FieldDiff label={t('fieldDescriptionLabel')} current={currentValues!.description} proposed={data.description} />
        </>
      );
    }
    return (
      <>
        <DataPreview label={t('fieldTitleLabel')} value={data.title} />
        <DataPreview label={t('fieldSlugLabel')} value={data.slug} />
        <DataPreview label={t('fieldReciterIdLabel')} value={data.reciterId} />
        <DataPreview label={t('fieldYearLabel')} value={data.year} />
        <DataPreview label={t('fieldArtworkUrlLabel')} value={data.artworkUrl} />
        <DataPreview label={t('fieldDescriptionLabel')} value={data.description} />
      </>
    );
  }

  // track
  const data = submission.data as TrackSubmissionData;
  if (isEdit) {
    const currentLyrics = currentValues!.lyrics ?? {};
    const proposedLyrics = data.lyrics ?? {};
    const allLanguages = Array.from(
      new Set([...Object.keys(currentLyrics), ...Object.keys(proposedLyrics)]),
    );
    return (
      <>
        <FieldDiff label={t('fieldTitleLabel')} current={currentValues!.title} proposed={data.title} />
        <FieldDiff label={t('fieldSlugLabel')} current={currentValues!.slug} proposed={data.slug} />
        <FieldDiff label={t('fieldAlbumIdLabel')} current={currentValues!.albumId} proposed={data.albumId} />
        <FieldDiff label={t('fieldTrackNumberLabel')} current={currentValues!.trackNumber} proposed={data.trackNumber} />
        <FieldDiff label={t('fieldAudioUrlLabel')} current={currentValues!.audioUrl} proposed={data.audioUrl} />
        <FieldDiff label={t('fieldYouTubeIdLabel')} current={currentValues!.youtubeId} proposed={data.youtubeId} />
        <FieldDiff label={t('fieldDurationLabel')} current={currentValues!.duration} proposed={data.duration} />
        {allLanguages.map((lang) => (
          <FieldDiff
            key={lang}
            label={`${t('fieldLyricsLabel')} (${lang})`}
            current={currentLyrics[lang]}
            proposed={proposedLyrics[lang as keyof typeof proposedLyrics]}
          />
        ))}
      </>
    );
  }
  const proposedLyrics = data.lyrics ?? {};
  return (
    <>
      <DataPreview label={t('fieldTitleLabel')} value={data.title} />
      <DataPreview label={t('fieldSlugLabel')} value={data.slug} />
      <DataPreview label={t('fieldAlbumIdLabel')} value={data.albumId} />
      <DataPreview label={t('fieldTrackNumberLabel')} value={data.trackNumber} />
      <DataPreview label={t('fieldAudioUrlLabel')} value={data.audioUrl} />
      <DataPreview label={t('fieldYouTubeIdLabel')} value={data.youtubeId} />
      <DataPreview label={t('fieldDurationLabel')} value={data.duration} />
      {Object.entries(proposedLyrics).map(([lang, text]) => (
        <DataPreview
          key={lang}
          label={`${t('fieldLyricsLabel')} (${lang})`}
          value={text}
        />
      ))}
    </>
  );
}
