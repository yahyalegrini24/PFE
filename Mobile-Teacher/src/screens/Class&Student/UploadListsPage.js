import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  LayoutAnimation
} from "react-native";
import { MaterialCommunityIcons, MaterialIcons, Feather } from "@expo/vector-icons";
import { supabase } from "../../configuration/supabase";
import Footer from "../../components/Footer";
import { UserContext } from "../../context/UserContext";

const GroupManagement = ({ navigation }) => {
  const { user } = useContext(UserContext);
  const [organizedData, setOrganizedData] = useState([]);
  const [chosenGroups, setChosenGroups] = useState([]);
  const [assignedGroups, setAssignedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [dataStructure, setDataStructure] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [showSemesterFilter, setShowSemesterFilter] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState(null);

  // Helper function to extract academic year from path
  const extractAcademicYearFromPath = useCallback((filePath) => {
    if (!filePath) return null;
    const academicYearMatch = filePath.match(/\\(\d{4})\\|\/(\d{4})\//);
    return academicYearMatch ? academicYearMatch[1] || academicYearMatch[2] : null;
  }, []);

  // Check if group belongs to current academic year
  const isGroupInCurrentAcademicYear = useCallback((groupPath, currentAcademicYear) => {
    if (!currentAcademicYear || !groupPath) return false;
    const pathAcademicYear = extractAcademicYearFromPath(groupPath);
    if (!pathAcademicYear) return false;
    
    const academicYearLabel = currentAcademicYear.label;
    let expectedPathYear = null;
    
    if (academicYearLabel.includes('-')) {
      const years = academicYearLabel.split('-');
      if (years.length === 2) {
        expectedPathYear = years[0].slice(-2) + years[1].slice(-2);
      }
    } else if (academicYearLabel.length === 4) {
      expectedPathYear = academicYearLabel;
    }
    
    return pathAcademicYear === expectedPathYear;
  }, [extractAcademicYearFromPath]);

  // Fetch Academic Years
  const fetchAcademicYears = async () => {
    try {
      const { data, error } = await supabase
        .from('AcademicYear')
        .select('*')
        .order('AcademicId', { ascending: true });

      if (error) throw error;
      setAcademicYears(data || []);
    } catch (error) {
      console.error("Error fetching academic years:", error);
      setStatusMessage({ type: "error", text: "Failed to load academic years" });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // Determine current academic year
  const determineCurrentAcademicYear = useCallback(() => {
    const currentDate = new Date();
    
    const currentSemester = semesters.find(semester => {
      if (!semester.StartDate || !semester.EndDate) return false;
      const startDate = new Date(semester.StartDate);
      const endDate = new Date(semester.EndDate);
      return currentDate >= startDate && currentDate <= endDate;
    });

    if (currentSemester && currentSemester.AcademicId) {
      const academicYear = academicYears.find(year => year.AcademicId === currentSemester.AcademicId);
      setCurrentAcademicYear(academicYear);
      return academicYear;
    } else {
      setCurrentAcademicYear(null);
      setStatusMessage({ type: "warning", text: "Academic year still doesn't start" });
      setTimeout(() => setStatusMessage(null), 3000);
      return null;
    }
  }, [semesters, academicYears]);

  useEffect(() => {
    if (semesters.length > 0 && academicYears.length > 0) {
      determineCurrentAcademicYear();
    }
  }, [semesters, academicYears, determineCurrentAcademicYear]);

  // Fetch all available semesters with Academic Year info
  const fetchSemesters = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('Semestre')
        .select(`
          *,
          AcademicYear:AcademicId (
            AcademicId,
            label
          )
        `)
        .order('StartDate', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching semesters:", error);
      setStatusMessage({ type: "error", text: "Failed to load semesters" });
      setTimeout(() => setStatusMessage(null), 3000);
      return [];
    }
  }, []);

  const fetchTeacherGroups = useCallback(async (semesterId = null) => {
    if (!user?.teacherId) return [];

    try {
      let query = supabase
        .from('Teacher_group')
        .select(`
          groupId,
          semestreId,
          Group:groupId (
            groupId,
            groupName,
            group_path,
            Section:sectionId (
              sectionId,
              sectionName,
              SchoolYear:yearId (
                yearId,
                yearName,
                Degree:degreeId (
                  degreeId,
                  degreeName
                )
              )
            )
          ),
          Semestre:semestreId (
            SemesterId,
            label
          )
        `)
        .eq('teacherId', user.teacherId);

      if (semesterId) {
        query = query.eq('semestreId', semesterId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(item => ({
        groupId: item.groupId,
        groupName: item.Group.groupName,
        degreeName: item.Group.Section?.SchoolYear?.Degree?.degreeName || "Unknown Degree",
        yearName: item.Group.Section?.SchoolYear?.yearName || "Unknown Year",
        sectionName: item.Group.Section?.sectionName || "Unknown Section",
        filePath: item.Group.group_path || "Unknown Path",
        semesterId: item.semestreId,
        semesterLabel: item.Semestre?.label || "No Semester"
      }));
    } catch (error) {
      console.error("Error fetching teacher groups:", error);
      setStatusMessage({ type: "error", text: "Failed to load assigned groups" });
      setTimeout(() => setStatusMessage(null), 3000);
      return [];
    }
  }, [user]);

  const fetchAllGroups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('Group')
        .select(`
          groupId,
          groupName,
          group_path,
          Section:sectionId (
            sectionId,
            sectionName,
            SchoolYear:yearId (
              yearId,
              yearName,
              Degree:degreeId (
                degreeId,
                degreeName
              )
            )
          )
        `)
        .eq('Section.SchoolYear.branchId', user.branchId);

      if (error) throw error;
      
      // Filter groups based on current academic year in path
      const filteredData = data.filter(group => {
        if (!currentAcademicYear) return true;
        return isGroupInCurrentAcademicYear(group.group_path, currentAcademicYear);
      });
      
      return filteredData;
    } catch (error) {
      console.error("Error fetching all groups:", error);
      setStatusMessage({ type: "error", text: "Failed to load available groups" });
      setTimeout(() => setStatusMessage(null), 3000);
      return [];
    }
  }, [user, currentAcademicYear, isGroupInCurrentAcademicYear]);

  const buildDataStructure = useCallback((groups, assignedGroups) => {
    const degrees = {};
    
    groups.forEach(group => {
      const section = group.Section;
      const schoolYear = section?.SchoolYear;
      const degree = schoolYear?.Degree;
      const filePath = group.group_path;
      
      if (!degree || !schoolYear || !section) return;

      // Skip if not in current academic year
      if (currentAcademicYear && !isGroupInCurrentAcademicYear(filePath, currentAcademicYear)) {
        return;
      }

      if (!degrees[degree.degreeId]) {
        degrees[degree.degreeId] = {
          id: `degree-${degree.degreeId}`,
          name: degree.degreeName,
          type: 'degree',
          years: {},
          expanded: expandedItems[`degree-${degree.degreeId}`] || false
        };
      }

      if (!degrees[degree.degreeId].years[schoolYear.yearId]) {
        degrees[degree.degreeId].years[schoolYear.yearId] = {
          id: `year-${schoolYear.yearId}`,
          name: schoolYear.yearName,
          type: 'year',
          sections: {},
          expanded: expandedItems[`year-${schoolYear.yearId}`] || false
        };
      }

      if (!degrees[degree.degreeId].years[schoolYear.yearId].sections[section.sectionId]) {
        degrees[degree.degreeId].years[schoolYear.yearId].sections[section.sectionId] = {
          id: `section-${section.sectionId}`,
          name: section.sectionName,
          type: 'section',
          files: {},
          expanded: expandedItems[`section-${section.sectionId}`] || false
        };
      }

      const fileKey = filePath || 'no-path';
      if (!degrees[degree.degreeId].years[schoolYear.yearId].sections[section.sectionId].files[fileKey]) {
        degrees[degree.degreeId].years[schoolYear.yearId].sections[section.sectionId].files[fileKey] = {
          id: `file-${fileKey}`,
          name: filePath?.split(/[\\/]/).pop() || "No File Path",
          path: filePath,
          type: 'file',
          groups: [],
          expanded: expandedItems[`file-${fileKey}`] || false,
          degreeName: degree.degreeName,
          yearName: schoolYear.yearName,
          sectionName: section.sectionName
        };
      }

      degrees[degree.degreeId].years[schoolYear.yearId].sections[section.sectionId].files[fileKey].groups.push({
        groupId: group.groupId,
        groupName: group.groupName,
        studentCount: 0,
        isAssigned: assignedGroups.some(g => g.groupId === group.groupId),
        semesterId: assignedGroups.find(g => g.groupId === group.groupId)?.semesterId || null,
        semesterLabel: assignedGroups.find(g => g.groupId === group.groupId)?.semesterLabel || "No Semester"
      });
    });

    return degrees;
  }, [expandedItems, currentAcademicYear, isGroupInCurrentAcademicYear]);

  const buildRenderData = useCallback((degrees) => {
    const renderData = [];
    
    Object.values(degrees).forEach(degree => {
      renderData.push(degree);
      
      if (degree.expanded) {
        Object.values(degree.years).forEach(year => {
          renderData.push(year);
          
          if (year.expanded) {
            Object.values(year.sections).forEach(section => {
              renderData.push(section);
              
              if (section.expanded) {
                Object.values(section.files).forEach(file => {
                  renderData.push(file);
                });
              }
            });
          }
        });
      }
    });

    return renderData;
  }, []);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First load academic years and semesters
      const [semesterData] = await Promise.all([
        fetchSemesters(),
        academicYears.length === 0 ? fetchAcademicYears() : Promise.resolve()
      ]);

      setSemesters(semesterData);

      // Then load groups after we have academic year info
      const [teacherGroups, allGroups] = await Promise.all([
        fetchTeacherGroups(selectedSemester),
        fetchAllGroups()
      ]);

      setAssignedGroups(teacherGroups);
      setChosenGroups(teacherGroups);

      const degrees = buildDataStructure(allGroups, teacherGroups);
      const renderData = buildRenderData(degrees);
      
      setDataStructure(degrees);
      setOrganizedData(renderData);
    } catch (err) {
      console.error("Failed to load data:", err);
      setStatusMessage({ type: "error", text: "Failed to load group data" });
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, fetchTeacherGroups, fetchAllGroups, buildDataStructure, buildRenderData, fetchSemesters, selectedSemester, academicYears, currentAcademicYear]);

  useEffect(() => {
    loadData();
  }, [loadData, selectedSemester, currentAcademicYear]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItems(prev => {
      const newState = {
        ...prev,
        [id]: !prev[id]
      };
      
      const degrees = JSON.parse(JSON.stringify(dataStructure));
      Object.values(degrees).forEach(degree => {
        degree.expanded = newState[degree.id] || false;
        Object.values(degree.years).forEach(year => {
          year.expanded = newState[year.id] || false;
          Object.values(year.sections).forEach(section => {
            section.expanded = newState[section.id] || false;
          });
        });
      });
      
      const renderData = buildRenderData(degrees);
      setOrganizedData(renderData);
      
      return newState;
    });
  };

  const toggleGroupSelection = (file, group) => {
    setChosenGroups(prev => {
      const existingIndex = prev.findIndex(g => g.groupId === group.groupId);
      
      if (existingIndex >= 0) {
        return prev.filter((_, index) => index !== existingIndex);
      } else {
        return [...prev, { 
          ...group,
          fileId: file.id,
          fileName: file.name,
          degreeName: file.degreeName,
          yearName: file.yearName,
          sectionName: file.sectionName,
          semesterId: selectedSemester,
          semesterLabel: semesters.find(s => s.SemesterId === selectedSemester)?.label || "No Semester"
        }];
      }
    });
  };

  const isGroupSelected = (groupId) => {
    return chosenGroups.some(g => g.groupId === groupId);
  };

  const isGroupAssigned = (groupId) => {
    return assignedGroups.some(g => g.groupId === groupId);
  };

  const removeGroup = (groupId) => {
    setChosenGroups(chosenGroups.filter(g => g.groupId !== groupId));
  };

  const saveSelectedGroups = async () => {
    if (!user?.teacherId) {
      setStatusMessage({ type: "error", text: "Teacher ID not found" });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    if (!selectedSemester) {
      setStatusMessage({ type: "error", text: "Please select a semester first" });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    try {
      setSaving(true);
      
      // First, delete all existing assignments for this teacher in this semester
      const { error: deleteError } = await supabase
        .from('Teacher_group')
        .delete()
        .eq('teacherId', user.teacherId)
        .eq('semestreId', selectedSemester);

      if (deleteError) throw deleteError;

      // Then insert the new assignments
      if (chosenGroups.length > 0) {
        const insertData = chosenGroups.map(group => ({
          teacherId: user.teacherId,
          groupId: group.groupId,
          semestreId: selectedSemester
        }));

        const { error: insertError } = await supabase
          .from('Teacher_group')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      const updatedGroups = await fetchTeacherGroups(selectedSemester);
      setAssignedGroups(updatedGroups);
      
      setStatusMessage({ type: "success", text: "Groups saved successfully!" });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error("Error saving groups:", error);
      setStatusMessage({ type: "error", text: "Failed to save groups" });
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const renderItem = (item) => {
    switch (item.type) {
      case 'degree':
        return (
          <TouchableOpacity 
            style={styles.degreeItem}
            onPress={() => toggleExpand(item.id)}
          >
            <View style={styles.itemContent}>
              <MaterialCommunityIcons 
                name={item.expanded ? "chevron-down" : "chevron-right"} 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.degreeText}>{item.name}</Text>
            </View>
          </TouchableOpacity>
        );
      
      case 'year':
        return (
          <TouchableOpacity 
            style={styles.yearItem}
            onPress={() => toggleExpand(item.id)}
          >
            <View style={styles.itemContent}>
              <MaterialCommunityIcons 
                name={item.expanded ? "chevron-down" : "chevron-right"} 
                size={24} 
                color="#006633" 
              />
              <Text style={styles.yearText}>{item.name}</Text>
              <Text style={styles.countText}>
                {Object.keys(item.sections).length} Sections
              </Text>
            </View>
          </TouchableOpacity>
        );
      
      case 'section':
        return (
          <TouchableOpacity 
            style={styles.sectionItem}
            onPress={() => toggleExpand(item.id)}
          >
            <View style={styles.itemContent}>
              <MaterialCommunityIcons 
                name={item.expanded ? "chevron-down" : "chevron-right"} 
                size={24} 
                color="#006633" 
              />
              <Text style={styles.sectionText}>{item.name}</Text>
            </View>
          </TouchableOpacity>
        );
      
      case 'file':
        return (
          <View style={styles.fileItem}>
            <View style={styles.groupsContainer}>
              {item.groups.map(group => (
                <TouchableOpacity 
                  key={group.groupId}
                  style={[
                    styles.groupItem,
                    isGroupSelected(group.groupId) && styles.selectedGroupItem,
                    isGroupAssigned(group.groupId) && !isGroupSelected(group.groupId) && styles.assignedGroupItem
                  ]}
                  onPress={() => toggleGroupSelection(item, group)}
                >
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{group.groupName}</Text>
                    {isGroupAssigned(group.groupId) && !isGroupSelected(group.groupId) && (
                      <Text style={styles.assignedBadge}>{group.semesterLabel}</Text>
                    )}
                  </View>
                  {isGroupSelected(group.groupId) ? (
                    <MaterialIcons name="check-box" size={24} color="#006633" />
                  ) : (
                    <MaterialIcons name="check-box-outline-blank" size={24} color="#ccc" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Message */}
      {statusMessage && (
        <Animated.View 
          style={[
            styles.statusMessage,
            statusMessage.type === "success" 
              ? styles.successMessage 
              : styles.errorMessage
          ]}
        >
          <View style={styles.statusContent}>
            {statusMessage.type === "success" ? (
              <Feather name="check-circle" size={20} color="#fff" />
            ) : (
              <Feather name="alert-circle" size={20} color="#fff" />
            )}
            <Text style={styles.statusText}>{statusMessage.text}</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#006633"]}
            tintColor="#006633"
          />
        }
      >
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Group Management</Text>
          <Text style={styles.subHeader}>Manage your assigned student groups</Text>
        </View>

        {/* Current Academic Year Display */}
        {currentAcademicYear && (
          <View style={styles.academicYearContainer}>
            <Feather name="calendar" size={20} color="#1e40af" />
            <Text style={styles.academicYearText}>
              Current Academic Year: {currentAcademicYear.label}
            </Text>
          </View>
        )}

        {/* Semester Filter */}
        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={styles.semesterFilterButton}
            onPress={() => setShowSemesterFilter(true)}
          >
            <Feather name="filter" size={18} color="#006633" />
            <Text style={styles.semesterFilterText}>
              {selectedSemester 
                ? semesters.find(s => s.SemesterId === selectedSemester)?.label || "Select Semester"
                : "All Semesters"}
            </Text>
            <Feather 
              name={showSemesterFilter ? "chevron-up" : "chevron-down"} 
              size={18} 
              color="#006633" 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Feather 
              name="refresh-cw" 
              size={18} 
              color="#006633" 
              style={refreshing && styles.refreshingIcon} 
            />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.fullScreenLoading}>
            <ActivityIndicator size="large" color="#006633" />
            <Text style={styles.loadingText}>Loading groups...</Text>
          </View>
        ) : (
          <View style={styles.mainContent}>
            {/* Available Groups */}
            <View style={styles.availableGroupsContainer}>
              <Text style={styles.sectionTitle}>Available Groups</Text>
              
              {organizedData.length > 0 ? (
                organizedData.map(item => (
                  <View key={item.id}>
                    {renderItem(item)}
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>
                  {currentAcademicYear 
                    ? `No groups available for academic year ${currentAcademicYear.label}` 
                    : "No groups available"}
                </Text>
              )}
            </View>

            {/* Selected Groups */}
            <View style={styles.selectedContainer}>
              <View style={styles.selectedHeader}>
                <Text style={styles.sectionTitle}>Selected Groups</Text>
                <View style={styles.selectedCountBadge}>
                  <Text style={styles.selectedCountText}>{chosenGroups.length}</Text>
                </View>
              </View>
              
              {selectedSemester && (
                <View style={styles.semesterBadge}>
                  <Text style={styles.semesterBadgeText}>
                    Semester: {semesters.find(s => s.SemesterId === selectedSemester)?.label || "Unknown"}
                  </Text>
                </View>
              )}

              {chosenGroups.length > 0 ? (
                <ScrollView 
                  style={styles.selectedGroupsList}
                  contentContainerStyle={styles.selectedGroupsListContent}
                >
                  {chosenGroups.map(group => (
                    <View key={group.groupId} style={styles.selectedGroupCard}>
                      <View style={styles.selectedGroupInfo}>
                        <Text style={styles.selectedGroupName}>{group.groupName}</Text>
                        <Text style={styles.selectedGroupDetails}>
                          {group.degreeName} • {group.yearName} • {group.sectionName}
                        </Text>
                        {group.semesterLabel && (
                          <Text style={styles.selectedGroupSemester}>
                            {group.semesterLabel}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity 
                        onPress={() => removeGroup(group.groupId)}
                        style={styles.removeButton}
                      >
                        <Feather name="x" size={20} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noSelectionText}>
                  {selectedSemester ? "No groups selected" : "Please select a semester first"}
                </Text>
              )}

              {chosenGroups.length > 0 && (
                <TouchableOpacity 
                  style={[
                    styles.saveButton,
                    (!selectedSemester || saving) && styles.saveButtonDisabled
                  ]}
                  onPress={saveSelectedGroups}
                  disabled={saving || !selectedSemester}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {chosenGroups.some(g => isGroupAssigned(g.groupId)) 
                        ? "Update Assignments" 
                        : "Save Assignments"}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
      
      {/* Semester Filter Modal */}
      <Modal
        visible={showSemesterFilter}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSemesterFilter(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSemesterFilter(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        
        <View style={styles.modalContent}>
          <ScrollView style={styles.modalScroll}>
            <TouchableOpacity
              style={[
                styles.modalOption,
                !selectedSemester && styles.modalOptionSelected
              ]}
              onPress={() => {
                setSelectedSemester(null);
                setShowSemesterFilter(false);
              }}
            >
              <Text style={!selectedSemester ? styles.modalOptionTextSelected : styles.modalOptionText}>
                All Semesters
              </Text>
            </TouchableOpacity>
            
            {semesters
              .filter(semester => 
                !currentAcademicYear || semester.AcademicId === currentAcademicYear.AcademicId
              )
              .map(semester => (
                <TouchableOpacity
                  key={semester.SemesterId}
                  style={[
                    styles.modalOption,
                    selectedSemester === semester.SemesterId && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedSemester(semester.SemesterId);
                    setShowSemesterFilter(false);
                  }}
                >
                  <Text style={selectedSemester === semester.SemesterId ? styles.modalOptionTextSelected : styles.modalOptionText}>
                    {semester.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      </Modal>

      <Footer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa"
  },
  scrollContent: {
    paddingBottom: 80,
    paddingHorizontal: 16
  },
  headerContainer: {
    marginBottom: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#006633",
    marginBottom: 4,
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 14,
    color: "#64748b",
    textAlign: 'center',
  },
  academicYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  academicYearText: {
    marginLeft: 8,
    color: '#1e40af',
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  semesterFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#006633',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 8
  },
  semesterFilterText: {
    color: '#006633',
    fontWeight: '500',
    marginHorizontal: 10,
    flex: 1
  },
  refreshButton: {
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#006633',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  refreshingIcon: {
    transform: [{ rotate: '360deg' }]
  },
  mainContent: {
    flex: 1
  },
  availableGroupsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#006633",
    marginBottom: 12
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 16
  },
  degreeItem: {
    backgroundColor: '#006633',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8
  },
  degreeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8
  },
  yearItem: {
    backgroundColor: '#e6f2e6',
    borderRadius: 6,
    padding: 14,
    marginLeft: 16,
    marginBottom: 6
  },
  yearText: {
    color: '#006633',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  sectionItem: {
    backgroundColor: '#f0f7f0',
    borderRadius: 4,
    padding: 12,
    marginLeft: 32,
    marginBottom: 4
  },
  sectionText: {
    color: '#006633',
    fontSize: 15,
    marginLeft: 8
  },
  fileItem: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 12,
    marginLeft: 48,
    marginBottom: 8,
    elevation: 1
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  countText: {
    marginLeft: 'auto',
    color: '#006633',
    fontSize: 14
  },
  groupsContainer: {
    marginTop: 8
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginVertical: 2,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  selectedGroupItem: {
    borderColor: '#006633',
    backgroundColor: '#e6f2e6'
  },
  assignedGroupItem: {
    borderColor: '#ffb347',
    backgroundColor: '#fff5e6'
  },
  groupInfo: {
    flex: 1
  },
  groupName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b'
  },
  assignedBadge: {
    fontSize: 12,
    color: '#cc8400',
    marginTop: 2
  },
  selectedContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    elevation: 2
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  selectedCountBadge: {
    backgroundColor: '#006633',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8
  },
  selectedCountText: {
    color: '#fff',
    fontSize: 14
  },
  semesterBadge: {
    backgroundColor: '#e6f2ff',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#cce0ff'
  },
  semesterBadgeText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: '500'
  },
  selectedGroupsList: {
    maxHeight: 200,
    marginBottom: 8
  },
  selectedGroupsListContent: {
    paddingBottom: 8
  },
  selectedGroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginVertical: 4,
    elevation: 1
  },
  selectedGroupInfo: {
    flex: 1
  },
  selectedGroupName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 2
  },
  selectedGroupDetails: {
    fontSize: 13,
    color: '#006633',
    marginBottom: 2
  },
  selectedGroupSemester: {
    fontSize: 12,
    color: '#0066cc',
    fontStyle: 'italic'
  },
  removeButton: {
    padding: 4
  },
  noSelectionText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 16,
    fontSize: 14
  },
  saveButton: {
    backgroundColor: '#006633',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveButtonDisabled: {
    backgroundColor: '#cccccc'
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  fullScreenLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 200
  },
  loadingText: {
    marginTop: 16,
    color: '#006633',
    fontSize: 16
  },
  statusMessage: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 100,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5
  },
  successMessage: {
    backgroundColor: '#006633'
  },
  errorMessage: {
    backgroundColor: '#ff4444'
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '50%'
  },
  modalScroll: {
    flex: 1
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalOptionSelected: {
    backgroundColor: '#f0f7f0'
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333'
  },
  modalOptionTextSelected: {
    fontSize: 16,
    color: '#006633',
    fontWeight: '500'
  }
});

export default GroupManagement;