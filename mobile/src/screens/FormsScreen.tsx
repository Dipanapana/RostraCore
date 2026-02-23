import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { formsApi } from '../services/api';
import { FormTemplate } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormField {
  label: string;
  field_type: 'text' | 'number' | 'textarea' | 'checkbox' | 'select' | 'date';
  required: boolean;
  options?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFormTypeColor(formType: string): string {
  switch (formType.toLowerCase()) {
    case 'checklist':
      return '#22d3ee';
    case 'inspection':
      return '#f59e0b';
    case 'incident':
      return '#ef4444';
    case 'report':
      return '#3b82f6';
    case 'audit':
      return '#a78bfa';
    default:
      return '#7c3aed';
  }
}

function getTodayFormatted(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FormsScreen() {
  const navigation = useNavigation();

  // -- Template list state --
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // -- Form fill-out state --
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const loadTemplates = useCallback(async () => {
    try {
      const res = await formsApi.getTemplates({ status: 'active' });
      setTemplates(res.data?.templates || res.data || []);
    } catch {
      // Silently fail -- user can pull-to-refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTemplates();
    setRefreshing(false);
  };

  // -----------------------------------------------------------------------
  // GPS acquisition
  // -----------------------------------------------------------------------

  const acquireGps = useCallback(async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location permission is needed to tag form submissions with GPS coordinates.',
        );
        setGpsLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setGpsLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch {
      // GPS is optional -- continue without
    } finally {
      setGpsLoading(false);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Template selection
  // -----------------------------------------------------------------------

  const openTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);

    // Build default values for each field
    const defaults: Record<string, any> = {};
    const fields: FormField[] = template.fields || [];
    fields.forEach((field, index) => {
      const key = `field_${index}`;
      switch (field.field_type) {
        case 'checkbox':
          defaults[key] = false;
          break;
        case 'date':
          defaults[key] = getTodayFormatted();
          break;
        case 'select':
          defaults[key] = '';
          break;
        default:
          defaults[key] = '';
      }
    });
    setFormValues(defaults);

    // Acquire GPS in background
    acquireGps();
  };

  const closeTemplate = () => {
    setSelectedTemplate(null);
    setFormValues({});
    setGpsLocation(null);
  };

  // -----------------------------------------------------------------------
  // Form value updates
  // -----------------------------------------------------------------------

  const updateField = (key: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  // -----------------------------------------------------------------------
  // Form submission
  // -----------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!selectedTemplate) return;

    const fields: FormField[] = selectedTemplate.fields || [];

    // Validate required fields
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const key = `field_${i}`;
      const value = formValues[key];

      if (field.required) {
        if (field.field_type === 'checkbox') {
          // Checkbox doesn't need "required" validation the same way
          continue;
        }
        if (value === undefined || value === null || value === '') {
          Alert.alert(
            'Required Field',
            `Please fill in "${field.label}" before submitting.`,
          );
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      // Build submission data keyed by field label
      const submissionData: Record<string, any> = {};
      fields.forEach((field, index) => {
        const key = `field_${index}`;
        submissionData[field.label] = formValues[key];
      });

      await formsApi.submitForm({
        template_id: selectedTemplate.template_id,
        data: submissionData,
        gps_latitude: gpsLocation?.latitude,
        gps_longitude: gpsLocation?.longitude,
      });

      Alert.alert(
        'Form Submitted',
        `"${selectedTemplate.name}" has been submitted successfully.`,
        [{ text: 'OK', onPress: closeTemplate }],
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || 'Failed to submit form. Please try again.';
      Alert.alert('Submission Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Render: Form field
  // -----------------------------------------------------------------------

  const renderField = (field: FormField, index: number) => {
    const key = `field_${index}`;
    const value = formValues[key];

    return (
      <View key={key} style={styles.fieldContainer}>
        {/* Label */}
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          {field.required && <Text style={styles.requiredAsterisk}>*</Text>}
        </View>

        {/* Field input */}
        {field.field_type === 'text' && (
          <TextInput
            style={styles.textInput}
            value={value || ''}
            onChangeText={(text) => updateField(key, text)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            placeholderTextColor="#475569"
            selectionColor="#7c3aed"
          />
        )}

        {field.field_type === 'number' && (
          <TextInput
            style={styles.textInput}
            value={value || ''}
            onChangeText={(text) => updateField(key, text)}
            placeholder="0"
            placeholderTextColor="#475569"
            keyboardType="numeric"
            selectionColor="#7c3aed"
          />
        )}

        {field.field_type === 'textarea' && (
          <TextInput
            style={[styles.textInput, styles.textareaInput]}
            value={value || ''}
            onChangeText={(text) => updateField(key, text)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            placeholderTextColor="#475569"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            selectionColor="#7c3aed"
          />
        )}

        {field.field_type === 'checkbox' && (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{value ? 'Yes' : 'No'}</Text>
            <Switch
              value={!!value}
              onValueChange={(val) => updateField(key, val)}
              trackColor={{ false: '#334155', true: '#7c3aed' }}
              thumbColor={value ? '#a78bfa' : '#64748b'}
            />
          </View>
        )}

        {field.field_type === 'select' && field.options && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScrollView}
            contentContainerStyle={styles.chipContainer}
          >
            {field.options.map((option) => {
              const isSelected = value === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => updateField(key, isSelected ? '' : option)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.chipText, isSelected && styles.chipTextSelected]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {field.field_type === 'date' && (
          <View style={styles.dateDisplay}>
            <Text style={styles.dateIcon}>{'📅'}</Text>
            <Text style={styles.dateText}>{value || getTodayFormatted()}</Text>
          </View>
        )}
      </View>
    );
  };

  // -----------------------------------------------------------------------
  // Render: Template card
  // -----------------------------------------------------------------------

  const renderTemplateCard = ({ item }: { item: FormTemplate }) => {
    const fields: FormField[] = item.fields || [];
    const typeColor = getFormTypeColor(item.form_type);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openTemplate(item)}
        activeOpacity={0.7}
      >
        {/* Card top: name + type badge */}
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>
              {item.form_type}
            </Text>
          </View>
        </View>

        {/* Description */}
        {item.description ? (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Footer: field count + fill button */}
        <View style={styles.cardFooter}>
          <View style={styles.fieldCountContainer}>
            <Text style={styles.fieldCountIcon}>{'📝'}</Text>
            <Text style={styles.fieldCountText}>
              {fields.length} {fields.length === 1 ? 'field' : 'fields'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.fillButton}
            onPress={() => openTemplate(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.fillButtonText}>Fill Out</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // -----------------------------------------------------------------------
  // Render: Form fill-out view (View 2)
  // -----------------------------------------------------------------------

  if (selectedTemplate) {
    const fields: FormField[] = selectedTemplate.fields || [];

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Form header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={closeTemplate}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>{'← Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedTemplate.name}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.formScrollView}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Form info banner */}
          <View style={styles.formInfoBanner}>
            <View style={styles.formInfoRow}>
              <Text style={styles.formInfoLabel}>Type</Text>
              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: getFormTypeColor(selectedTemplate.form_type) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.typeBadgeText,
                    { color: getFormTypeColor(selectedTemplate.form_type) },
                  ]}
                >
                  {selectedTemplate.form_type}
                </Text>
              </View>
            </View>
            {selectedTemplate.description ? (
              <Text style={styles.formInfoDescription}>
                {selectedTemplate.description}
              </Text>
            ) : null}
            {/* GPS status */}
            <View style={styles.gpsRow}>
              <Text style={styles.gpsLabel}>GPS Location</Text>
              {gpsLoading ? (
                <View style={styles.gpsStatusRow}>
                  <ActivityIndicator size="small" color="#7c3aed" />
                  <Text style={styles.gpsStatusText}>Acquiring...</Text>
                </View>
              ) : gpsLocation ? (
                <View style={styles.gpsStatusRow}>
                  <Text style={styles.gpsCheckmark}>{'✓'}</Text>
                  <Text style={styles.gpsCoords}>
                    {gpsLocation.latitude.toFixed(5)}, {gpsLocation.longitude.toFixed(5)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.gpsUnavailable}>Unavailable</Text>
              )}
            </View>
          </View>

          {/* Fields */}
          {fields.length > 0 ? (
            fields.map((field, index) => renderField(field, index))
          ) : (
            <View style={styles.noFieldsContainer}>
              <Text style={styles.noFieldsText}>
                This form template has no fields configured.
              </Text>
            </View>
          )}

          {/* Signature notice */}
          {selectedTemplate.requires_signature && (
            <View style={styles.signatureNotice}>
              <Text style={styles.signatureIcon}>{'✍️'}</Text>
              <Text style={styles.signatureText}>
                This form requires a signature upon submission.
              </Text>
            </View>
          )}

          {/* Submit button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Form</Text>
            )}
          </TouchableOpacity>

          {/* Bottom spacer for scroll comfort */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------------------------------
  // Render: Template list view (View 1)
  // -----------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>{'← Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forms</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Template grid */}
      <FlatList
        data={templates}
        renderItem={renderTemplateCard}
        keyExtractor={(item) => item.template_id.toString()}
        contentContainerStyle={styles.listContent}
        numColumns={1}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c3aed"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{'📋'}</Text>
            <Text style={styles.emptyTitle}>No Forms Available</Text>
            <Text style={styles.emptySubtitle}>
              There are no active form templates assigned to you. Check back later or
              contact your supervisor.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // -- Header --
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  backText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60,
  },

  // -- Template list --
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // -- Template card --
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardDescription: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  fieldCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldCountIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  fieldCountText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
  },
  fillButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  fillButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // -- Form fill-out --
  formScrollView: {
    flex: 1,
  },
  formContent: {
    padding: 16,
  },

  // Form info banner
  formInfoBanner: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  formInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formInfoLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  formInfoDescription: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  gpsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  gpsLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  gpsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gpsStatusText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  gpsCheckmark: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '700',
  },
  gpsCoords: {
    color: '#e2e8f0',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  gpsUnavailable: {
    color: '#64748b',
    fontSize: 12,
  },

  // -- Field container --
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  requiredAsterisk: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 4,
  },

  // Text inputs
  textInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 14,
    color: '#f8fafc',
    fontSize: 15,
  },
  textareaInput: {
    minHeight: 100,
    paddingTop: 14,
  },

  // Switch / checkbox
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 14,
  },
  switchLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },

  // Select chips
  chipScrollView: {
    flexGrow: 0,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipSelected: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },

  // Date display
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  dateIcon: {
    fontSize: 18,
  },
  dateText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '500',
  },

  // No fields
  noFieldsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noFieldsText: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
  },

  // Signature notice
  signatureNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#422006',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  signatureIcon: {
    fontSize: 18,
  },
  signatureText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  // Submit button
  submitButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  // Bottom spacer
  bottomSpacer: {
    height: 60,
  },

  // -- Empty state --
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
