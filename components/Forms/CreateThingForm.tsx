import { useCategoriesQuery, useCreateProductMutation, useUploadImageMutation } from '@/api/hooks';
import { Category, ECurrencyType, EProductType } from '@/api/types';
import FormCheckbox from '@/components/FormElements/FormCheckbox';
import FormInput from '@/components/FormElements/FormInput';
import FormSelect from '@/components/FormElements/FormSelect';
import { useTranslations } from '@/hooks/use-translation';
import { useColor } from '@/hooks/useColor';
import { useAuthStore } from '@/modules/Auth/auth-store';
import { useRouter } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FormRow from '../FormElements/FormRow';
import ImageUploader from '../FormElements/ImageUploader';
import RadioButtonGroup, { RadioOption } from '../FormElements/RadioButtonGroup';
import MapModal from '../MapModal';

// Basic UUID generator for draft IDs (client-side only, non-critical)
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const CreateThingForm = () => {
  const { t, locale } = useTranslations();
  const { token } = useAuthStore()
  const primaryColor = useColor('primaryColor');
  const textColor = useColor('text');
  const router = useRouter();
  const [location, setLocation] = useState<{ latitude: number; longitude: number, address?: string } | null>(null);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);

  const form = useForm({
    defaultValues: {
      images: [],
      title: '',
      category: '',
      description: '',
      sellingMethod: 'for_sale',
      price: '',
      currency: 'SUM',
      canDeal: false,
      location: '',
    },
  });

  const { formState: { errors } } = form;
  const sellingMethod = form.watch('sellingMethod');
  const currency = form.watch('currency');

  const { data: categories } = useCategoriesQuery();

  const categoryOptions = categories?.data?.data?.map((category: Category) => ({
    value: category.id,
    label: locale === 'ru' ? category.name_ru : category.name_uz,
  })) || [];


  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadImageMutation();

  const { mutate: createProduct, isPending: isCreating } = useCreateProductMutation({
    onSuccess: () => {
      Alert.alert(
        t('post.success'),
        t('post.product_created_successfully'),
        [
          {
            text: t('common.ok'),
            onPress: () => router.back(),
          },
        ]
      );
      form.reset();
    },
    onError: (error: any) => {
      console.log('error', error);
      const message = error?.response?.data?.message || error?.message || t('post.error_creating_product');
      Alert.alert(t('post.error'), message);
    },
  });

  const isPending = isCreating || isUploading;

  const sellingMethodOptions: RadioOption[] = [
    {
      value: 'for_sale',
      label: t('post.for_sale'),
    },
    {
      value: 'free',
      label: t('post.free'),
    },
  ];

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!location) {
      Alert.alert(t('post.error'), t('post.please_select_location'));
      return;
    } 

    try {
      // ==========================================
      // 1-QADAM: Rasmlarni upload qilish (Batch Upload)
      // ==========================================
      const imageFormData = new FormData();

      // data.images - expo ImagePicker asset objects: { uri, fileName, mimeType, ... }
      data.images.forEach((image: any, index: number) => {
        const imageFile = {
          uri: image.uri,
          type: image.mimeType || 'image/jpeg',
          name: image.fileName || `image_${index}.jpg`,
        } as any;
        imageFormData.append('images', imageFile);
      });
      console.log('nimadir');

      // Serverga batch upload qilamiz
      const uploadResponse = await uploadImage(imageFormData)
        .then((res) => {
          console.log('uploadResponse', res);
          return res;
        })
        .catch((error) => {
          console.error('RAsmda Xatolik yuz berdi:', error);
        });

      // Serverdan qaytgan rasmlar massivi
      const uploadedImages = (uploadResponse?.data?.data || []).map((item: any, index: number) => ({
        draft_uuid: item.draft_uuid,
        image_url: item.draft_image_url || item.image_url,
        sort_order: index,
      }));

      // ==========================================
      // 2-QADAM: Create uchun asosiy FormData'ni yig'ish
      // ==========================================
      const formData = new FormData();

      formData.append('product_type', EProductType.THING.toString());
      formData.append('title', data.title);
      formData.append('description', data.description || '');

      if (data.category) {
        formData.append('category_id', data.category);
      } else {
        // category_id bo'sh bo'lsa, xato ko'rsatamiz (server '' ni qabul qilmaydi)
        Alert.alert(t('post.error'), t('post.errors.category'));
        return;
      }

      const isFree = data.sellingMethod === 'free';
      formData.append('is_free', isFree.toString());

      if (isFree) {
        formData.append('currency_type', ECurrencyType.UZS.toString());
      } else {
        const currencyType = data.currency === 'USD' ? ECurrencyType.USD : ECurrencyType.UZS;
        formData.append('currency_type', currencyType.toString());
        const priceField = data.currency === 'USD' ? 'price_usd' : 'price_uzs';
        formData.append(priceField, data.price.toString());
        formData.append('is_negotiable', data.canDeal.toString());
      }

      formData.append('latitude', location.latitude.toString());
      formData.append('longitude', location.longitude.toString());
      // moljal max 50 belgi (server talabi)
      const moljalValue = (location.address || data.location || '').substring(0, 50);
      formData.append('moljal', moljalValue);

      // ==========================================
      // 3-QADAM: Rasmlar ma'lumotini qo'shish
      // ==========================================
      formData.append('images_json', JSON.stringify(uploadedImages));

      if (uploadedImages.length > 0 && uploadedImages[0].image_url) {
        formData.append('main_image_url', uploadedImages[0].image_url);
      }

      // API'ga jo'natamiz 
      createProduct(formData);

    } catch (error: any) {
      console.error('Xatolik yuz berdi:', error);
      Alert.alert(t('post.error'), error?.response?.data?.message || error?.message || t('post.error_uploading_images'));
    }
  });

  const handleOpenMap = () => {
    setIsMapModalVisible(true);
  };

  const handleLocationSelect = (selectedLocation: { latitude: number; longitude: number, address?: string }) => {
    setLocation(selectedLocation);
    setIsMapModalVisible(false);
    form.setValue('location', selectedLocation.address || '');
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContent}>
        {/* Section 1: Images */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {t('post.images')}
          </Text>
          <ImageUploader
            control={form.control}
            name="images"
            maxImages={5}
            rules={{
              validate: (value: string[]) => value.length > 0 || t('post.errors.images'),
            }}
          />
        </View>

        {/* Section 2: Item Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {t('post.item_details')}
          </Text>

          <FormInput
            control={form.control}
            name="title"
            label={t('post.title')}
            placeholder={t('post.title_placeholder')}
            required
            rules={{
              required: t('post.errors.title'),
            }}
          />

          <FormSelect
            control={form.control}
            name="category"
            label={t('post.category')}
            placeholder={t('post.category')}
            options={categoryOptions}
            required
            rules={{
              required: t('post.errors.category'),
            }}
          />

          <FormInput
            control={form.control}
            name="description"
            label={t('post.description')}
            placeholder={t('post.description_placeholder')}
            type="textarea"
            rows={5}
          />
        </View>

        {/* Section 3: Selling Methods */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {t('post.selling_methods')}
          </Text>

          <RadioButtonGroup
            control={form.control}
            name="sellingMethod"
            options={sellingMethodOptions}
          />

          {sellingMethod === 'for_sale' && (
            <>
              <FormRow>
                <View style={styles.priceInputWrapper}>
                  <FormInput
                    control={form.control}
                    name="price"
                    label={t('post.price')}
                    placeholder={t('post.price_placeholder')}
                    keyboardType="numeric"
                    required
                    rules={{
                      required: t('post.errors.price'),
                    }}
                  />
                </View>
                <View style={[styles.currencyButtons, { marginBottom: form.formState.errors.price ? 20 : 0 }]}>
                  <TouchableOpacity
                    style={[
                      styles.currencyButton,
                      {
                        backgroundColor: currency === 'SUM' ? primaryColor : 'transparent',
                        borderColor: primaryColor,
                      }
                    ]}
                    onPress={() => form.setValue('currency', 'SUM')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.currencyButtonText,
                      { color: currency === 'SUM' ? '#fff' : primaryColor }
                    ]}>SUM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.currencyButton,
                      {
                        backgroundColor: currency === 'USD' ? primaryColor : 'transparent',
                        borderColor: primaryColor,
                      }
                    ]}
                    onPress={() => form.setValue('currency', 'USD')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.currencyButtonText,
                      { color: currency === 'USD' ? '#fff' : primaryColor }
                    ]}>USD</Text>
                  </TouchableOpacity>
                </View>
              </FormRow>
              <FormCheckbox
                control={form.control}
                name="canDeal"
                label={t('post.can_deal')}
              />
            </>
          )}
        </View>

        {/* Section 4: Meeting */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {t('post.meeting')}
          </Text>

          <FormRow>
            <View style={styles.locationInputWrapper}>
              <FormInput
                control={form.control}
                name="location"
                label={t('post.location')}
                placeholder={t('post.location_placeholder')}
                required
                rules={{
                  required: t('post.errors.location'),
                }}
              />
            </View>
            <TouchableOpacity
              style={[styles.mapButton, { backgroundColor: primaryColor, marginBottom: form.control._formState.errors.location ? 20 : 0 }]}
              onPress={handleOpenMap}
              activeOpacity={0.7}
            >
              <MapPin size={24} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
          </FormRow>
        </View>
      </View>

      {/* Fixed Bottom Post Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.postButton,
            {
              backgroundColor: isPending ? primaryColor + '80' : primaryColor,
              opacity: isPending ? 0.7 : 1,
            }
          ]}
          onPress={handleSubmit}
          disabled={isPending}
          activeOpacity={0.8}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
              <Text style={styles.postButtonText}>{t('post.post_button')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Map Modal */}
      <MapModal
        visible={isMapModalVisible}
        mode="SELECT"
        initialLocation={location || undefined}
        onClose={() => setIsMapModalVisible(false)}
        onLocationSelect={handleLocationSelect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContent: {
    // paddingHorizontal: 16,
    paddingBottom: 100, // Space for fixed button
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  priceInputWrapper: {
    flex: 1,
  },
  currencyButtons: {
    flexDirection: 'column',
    gap: 6,
    marginTop: 30, // Align with input (label height + margin)
  },
  currencyButton: {
    width: 52,
    height: 23,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationInputWrapper: {
    flex: 1,
  },
  mapButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30, // Align with input (label height + margin)
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    marginBottom: 16,
    paddingVertical: 12,
  },
  postButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateThingForm;