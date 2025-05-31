import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../configuration/supabase';
import { UserContext } from '../../context/UserContext';
import { useContext } from 'react';

const CourseDetailsScreen = ({ route, navigation }) => {
  const { day, hour, courseDetails = {} } = route.params || {};
  const { user } = useContext(UserContext);
  const [details, setDetails] = useState({
    year: courseDetails.year || '',
    yearId: courseDetails.yearId || '',
    degree: courseDetails.degree || '',
    degreeId: courseDetails.degreeId || '',
    name: courseDetails.name || '',
    moduleId: courseDetails.moduleId || '',
    group: courseDetails.group || '',
    groupId: courseDetails.groupId || '',
    type: courseDetails.type || '',
    typeId: courseDetails.typeId || '',
    sectionId: courseDetails.sectionId || '',
    room: courseDetails.room || { roomNumber: '', location: 'Unknown Location', classId: '' },
    classroomId: courseDetails.classroomId || '',
  });
  const [teacherGroups, setTeacherGroups] = useState([]);
  const [modules, setModules] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    group: false,
    module: false,
    classroom: false,
  });
  const [groupTypes, setGroupTypes] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.teacherId) return;
      
      setLoading(true);
      try {
        // Fetch teacher's groups
        const { data: teacherGroupsData, error: teacherGroupsError } = await supabase
          .from('Teacher_group')
          .select('groupId')
          .eq('teacherId', user.teacherId);

        if (teacherGroupsError) throw teacherGroupsError;

        // Fetch group types
        const { data: groupTypesData, error: groupTypesError } = await supabase
          .from('GroupType')
          .select('typeId, typeName');

        if (groupTypesError) throw groupTypesError;
        setGroupTypes(groupTypesData || []);

        if (teacherGroupsData && teacherGroupsData.length > 0) {
          const groupIds = teacherGroupsData.map(tg => tg.groupId);
          
          const { data: groupsData, error: groupsError } = await supabase
            .from('Group')
            .select(`
              groupId,
              groupName,
              sectionId,
              section:Section(
                sectionId,
                sectionName,
                yearId,
                year:SchoolYear(
                  yearId,
                  yearName,
                  degreeId,
                  degree:Degree(degreeName)
                )
              )
            `)
            .in('groupId', groupIds);
           
          if (groupsError) throw groupsError;
          setTeacherGroups(groupsData || []);
        }
        

        // Fetch classrooms
        const { data: classroomsData, error: classroomsError } = await supabase
          .from('Classroom')
          .select('classId, ClassNumber, Location');
      
        if (classroomsError) throw classroomsError;
        setClassrooms(classroomsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load required data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    const fetchModules = async () => {
      if (!details.groupId) return;
      
      setLoading(true);
      try {
        const selectedGroup = teacherGroups.find(g => g.groupId === details.groupId);
        
        if (selectedGroup && selectedGroup.section?.yearId) {
          const { data: modulesData, error: modulesError } = await supabase
            .from('Module')
            .select('moduleId, moduleName')
            .eq('yearId', selectedGroup.section.yearId);
        
          if (modulesError) throw modulesError;
          setModules(modulesData || []);
        }
      } catch (error) {
        console.error('Error fetching modules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [details.groupId, teacherGroups]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSelectGroup = (group) => {
    setDetails(prev => ({
      ...prev,
      group: group.groupName,
      groupId: group.groupId,
      degree: group.section?.year?.degree?.degreeName || '',
      degreeId: group.section?.year?.degreeId || '',
      year: group.section?.year?.yearName || '',
      yearId: group.section?.yearId || '',
      sectionId: group.sectionId || '',
      name: '',
      moduleId: '',
      type: '', // Reset type when changing group
      typeId: '' // Reset typeId when changing group
    }));
    setExpandedSections(prev => ({ ...prev, module: false, type: true })); // Open type selection after group selection
  };

  const handleSelect = (field, value, id) => {
    if (field === 'room') {
      const selectedClassroom = classrooms.find(c => c.classId === id);
      setDetails(prev => ({ 
        ...prev, 
        room: {
          roomNumber: selectedClassroom?.ClassNumber || value,
          location: selectedClassroom?.Location || 'Unknown Location',
          classId: id
        },
        classroomId: id
      }));
    } else if (field === 'name') {
      setDetails(prev => ({ 
        ...prev, 
        name: value,
        moduleId: id
      }));
    } else {
      setDetails(prev => ({ 
        ...prev, 
        [field]: value,
        [`${field}Id`]: id 
      }));
    }
  };

  const displaySelectedClassroom = () => {
    if (!details.classroomId) return 'Select classroom';
    const selectedClassroom = classrooms.find(c => c.classId === details.classroomId);
    if (!selectedClassroom) {
      return details.room?.location 
        ? `${details.room.location} - ${details.room.roomNumber}`
        : `Room ${details.room?.roomNumber || details.room}`;
    }
    return selectedClassroom.Location 
      ? `${selectedClassroom.Location} - ${selectedClassroom.ClassNumber}`
      : `Room ${selectedClassroom.ClassNumber}`;
  };

  const renderSelectionSection = (title, field, items, selectedValue) => {
    const isDisabled = field === 'module' && !details.group;
    return (
      <View style={styles.sectionContainer}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection(field)}
          disabled={isDisabled}
        >
          <View style={styles.sectionHeaderContent}>
            <MaterialCommunityIcons 
              name={expandedSections[field] ? "chevron-down" : "chevron-right"} 
              size={24} 
              color={isDisabled ? "#ccc" : "#006633"} 
            />
            <Text style={[
              styles.sectionTitle,
              isDisabled && styles.disabledText
            ]}>
              {title}
            </Text>
          </View>
          <Text style={[
            styles.selectedValue,
            isDisabled && styles.disabledText
          ]}>
            {selectedValue || `Select ${title.toLowerCase()}`}
          </Text>
        </TouchableOpacity>

        {expandedSections[field] && items.length > 0 && (
          <View style={styles.itemsContainer}>
            <FlatList
              data={items}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.item,
                    (field === 'name' ? details.moduleId === item.id : 
                     field === 'room' ? details.classroomId === item.id : 
                     false) && styles.selectedItem
                  ]}
                  onPress={() => {
                    handleSelect(field, item.value, item.id);
                    setExpandedSections(prev => ({ ...prev, [field]: false }));
                  }}
                >
                  <Text style={styles.itemText}>{item.label}</Text>
                  {(field === 'name' ? details.moduleId === item.id : 
                    field === 'room' ? details.classroomId === item.id : 
                    false) && (
                    <MaterialIcons name="check" size={20} color="#006633" />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item, index) => `${field}-${item.id || index}`}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              scrollEnabled={false}
            />
          </View>
        )}
      </View>
    );
  };

  const moduleOptions = modules.map(m => ({ 
    label: m.moduleName, 
    value: m.moduleName,
    id: m.moduleId 
  }));
  
  const classroomOptions = classrooms.map(r => ({ 
    label: r.ClassNumber ? (r.Location ? `${r.Location} - ${r.ClassNumber}` : `Room ${r.ClassNumber}`) : 'Unknown Room', 
    value: r.ClassNumber ? r.ClassNumber.toString() : 'unknown',
    id: r.classId
  }));

  const handleSave = () => {
    if (!details.year || !details.degree || !details.name || !details.room || !details.type) {
      const missingFields = [];
      if (!details.year) missingFields.push('year');
      if (!details.degree) missingFields.push('degree');
      if (!details.name) missingFields.push('name');
      if (!details.room) missingFields.push('room');
      if (!details.type) missingFields.push('type');
      
      console.log('Validation failed - missing fields:', missingFields);
      Alert.alert('Incomplete Information', 'Please fill all required fields');
      return;
    }

    const selectedClassroom = classrooms.find(c => c.classId === details.classroomId);
    
    const dataToSave = {
      year: details.year,
      yearId: details.yearId,
      degree: details.degree,
      degreeId: details.degreeId,
      name: details.name,
      moduleId: details.moduleId,
      group: details.group,
      groupId: details.groupId,
      type: details.type,
      typeId: details.typeId,
      sectionId: details.sectionId,
      room: {
        roomNumber: selectedClassroom?.ClassNumber || details.room.roomNumber || details.room,
        location: selectedClassroom?.Location || details.room.location || 'Unknown Location',
        classId: details.classroomId
      },
      classroomId: details.classroomId,
      sessionId: courseDetails.sessionId
    };
    
    
    if (route.params?.onSave) {
      route.params.onSave(dataToSave);
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Course Details</Text>
        <Text style={styles.subHeader}>{day} - {hour}</Text>

        <Text style={styles.sectionTitle}>Select Group</Text>
        <View style={styles.sectionContainer}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('group')}
          >
            <View style={styles.sectionHeaderContent}>
              <MaterialCommunityIcons 
                name={expandedSections.group ? "chevron-down" : "chevron-right"} 
                size={24} 
                color="#006633" 
              />
              <Text style={styles.sectionTitle}>Group</Text>
            </View>
            <Text style={styles.selectedValue}>
              {details.group || 'Select group'}
            </Text>
          </TouchableOpacity>

          {expandedSections.group && teacherGroups.length > 0 && (
            <View style={styles.itemsContainer}>
              <FlatList
                data={teacherGroups}
                renderItem={({ item: group }) => (
                  <TouchableOpacity
                    style={[
                      styles.item,
                      details.groupId === group.groupId && styles.selectedItem
                    ]}
                    onPress={() => handleSelectGroup(group)}
                  >
                    <View>
                      <Text style={styles.groupText}>
                        {group.groupName}
                      </Text>
                      <Text style={styles.groupDetails}>
                        {group.section?.year?.degree?.degreeName || 'Unknown'} - 
                        {group.section?.year?.yearName || 'Unknown'} - 
                        {group.section?.sectionName || 'Unknown'}
                      </Text>
                    </View>
                    {details.groupId === group.groupId && (
                      <MaterialIcons name="check" size={20} color="#006633" />
                    )}
                  </TouchableOpacity>
                )}
                keyExtractor={(item, index) => `group-${item.groupId || index}`}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>

        {details.group && (
          <>
            {renderSelectionSection("Module", "name", moduleOptions, details.name)}
            {renderSelectionSection(
              "Classroom", 
              "room", 
              classroomOptions, 
              displaySelectedClassroom()
            )}
          </>
        )}

        {details.group && (
          <View style={styles.sectionContainer}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => toggleSection('type')}
            >
              <View style={styles.sectionHeaderContent}>
                <MaterialCommunityIcons 
                  name={expandedSections.type ? "chevron-down" : "chevron-right"} 
                  size={24} 
                  color="#006633" 
                />
                <Text style={styles.sectionTitle}>Group Type</Text>
              </View>
              <Text style={styles.selectedValue}>
                {details.type || 'Select group type'}
              </Text>
            </TouchableOpacity>

            {expandedSections.type && groupTypes.length > 0 && (
              <View style={styles.itemsContainer}>
                <FlatList
                  data={groupTypes}
                  renderItem={({ item: type }) => (
                    <TouchableOpacity
                      style={[
                        styles.item,
                        details.typeId === type.typeId && styles.selectedItem
                      ]}
                      onPress={() => {
                        handleSelect('type', type.typeName, type.typeId);
                        setExpandedSections(prev => ({ ...prev, type: false }));
                      }}
                    >
                      <Text style={styles.itemText}>{type.typeName}</Text>
                      {details.typeId === type.typeId && (
                        <MaterialIcons name="check" size={20} color="#006633" />
                      )}
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => `type-${item.typeId}`}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  scrollEnabled={false}
                />
              </View>
            )}
          </View>
        )}

        <TouchableOpacity 
          style={[styles.saveButton, (loading || !details.group || !details.name || !details.room || !details.type) && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading || !details.group || !details.name || !details.room || !details.type}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#006633',
  },
  subHeader: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#555',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#006633',
    marginBottom: 10,
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 1,
  },
  sectionHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedValue: {
    fontSize: 14,
    color: '#64748b',
  },
  disabledText: {
    color: '#ccc',
  },
  itemsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  selectedItem: {
    backgroundColor: '#e6f2e6',
  },
  itemText: {
    fontSize: 15,
    color: '#1e293b',
  },
  groupText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  groupDetails: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  saveButton: {
    backgroundColor: '#006633',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24, 
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: '#cccccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }, 
});

export default CourseDetailsScreen;