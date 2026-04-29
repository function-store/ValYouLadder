import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Shield,
  Database,
  Calculator,
  LogOut,
  Trash2,
  Edit2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AdminEditDialog from "@/components/admin/AdminEditDialog";

interface ProjectSubmission {
  id: string;
  project_type: string;
  client_type: string;
  project_length: string;
  client_country: string | null;
  project_location: string;
  skills: string[];
  expertise_level: string;
  total_budget: number | null;
  your_budget: number;
  days_of_work: number | null;
  currency: string;
  rate_type: string | null;
  contracted_as: string | null;
  rate_representativeness: string | null;
  standard_rate: number | null;
  your_role: string | null;
  year_completed: number;
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

interface EstimateSubmission {
  id: string;
  project_type: string;
  client_type: string;
  project_length: string;
  client_country: string | null;
  project_location: string | null;
  skills: string[];
  expertise_level: string;
  low_estimate: number;
  mid_estimate: number;
  high_estimate: number;
  used_ai: boolean;
  sample_size: number;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, isLoading, isAdmin, signOut } = useAuth();
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [estimates, setEstimates] = useState<EstimateSubmission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "submission" | "estimate"; id: string } | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState<"submission" | "estimate">("submission");
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState("");
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [selectedEstimates, setSelectedEstimates] = useState<Set<string>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectSubmission | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [submissionsRes, estimatesRes] = await Promise.all([
        supabase
          .from("project_submissions")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("estimate_submissions")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (submissionsRes.error) throw submissionsRes.error;
      if (estimatesRes.error) throw estimatesRes.error;

      setSubmissions(submissionsRes.data || []);
      setEstimates(estimatesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    }
    setLoadingData(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const table = deleteTarget.type === "submission"
        ? "project_submissions"
        : "estimate_submissions";

      const { error } = await supabase.functions.invoke("admin-manage", {
        body: { action: "delete", table, id: deleteTarget.id },
      });

      if (error) throw error;

      if (deleteTarget.type === "submission") {
        setSubmissions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      } else {
        setEstimates((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      }

      toast.success(`${deleteTarget.type === "submission" ? "Submission" : "Estimate"} deleted`);
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete — are you signed in as admin?");
    }

    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleEditSave = async (updated: ProjectSubmission) => {
    try {
      const { error } = await supabase.functions.invoke("admin-manage", {
        body: {
          action: "update",
          table: "project_submissions",
          id: updated.id,
          updates: {
            project_type: updated.project_type,
            client_type: updated.client_type,
            project_length: updated.project_length,
            client_country: updated.client_country,
            project_location: updated.project_location,
            skills: updated.skills,
            expertise_level: updated.expertise_level,
            total_budget: updated.total_budget,
            your_budget: updated.your_budget,
            days_of_work: updated.days_of_work,
            currency: updated.currency,
            rate_type: updated.rate_type,
            contracted_as: updated.contracted_as,
            rate_representativeness: updated.rate_representativeness,
            standard_rate: updated.standard_rate,
            your_role: updated.your_role,
            year_completed: updated.year_completed,
            description: updated.description,
          },
        },
      });

      if (error) throw error;

      setSubmissions((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      toast.success("Submission updated");
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Failed to update — are you signed in as admin?");
    }

    setEditDialogOpen(false);
    setEditTarget(null);
  };

  const toggleSubmission = (id: string) => {
    setSelectedSubmissions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleEstimate = (id: string) => {
    setSelectedEstimates((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllSubmissions = () => {
    if (selectedSubmissions.size === submissions.length) {
      setSelectedSubmissions(new Set());
    } else {
      setSelectedSubmissions(new Set(submissions.map((s) => s.id)));
    }
  };

  const toggleAllEstimates = () => {
    if (selectedEstimates.size === estimates.length) {
      setSelectedEstimates(new Set());
    } else {
      setSelectedEstimates(new Set(estimates.map((e) => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    const ids = bulkDeleteType === "submission"
      ? Array.from(selectedSubmissions)
      : Array.from(selectedEstimates);

    if (ids.length === 0) return;

    const table = bulkDeleteType === "submission"
      ? "project_submissions"
      : "estimate_submissions";

    try {
      const { error } = await supabase.functions.invoke("admin-manage", {
        body: { action: "bulk-delete", table, ids },
      });

      if (error) throw error;

      if (bulkDeleteType === "submission") {
        setSubmissions((prev) => prev.filter((s) => !selectedSubmissions.has(s.id)));
        setSelectedSubmissions(new Set());
      } else {
        setEstimates((prev) => prev.filter((e) => !selectedEstimates.has(e.id)));
        setSelectedEstimates(new Set());
      }

      toast.success(`Deleted ${ids.length} ${bulkDeleteType === "submission" ? "submissions" : "estimates"}`);
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Failed to delete selected items — are you signed in as admin?");
    }

    setBulkDeleteDialogOpen(false);
    setBulkDeleteConfirmText("");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have admin access. Please contact an administrator to request access.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loadingData}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingData ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{submissions.length}</p>
                  <p className="text-sm text-muted-foreground">Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calculator className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{estimates.length}</p>
                  <p className="text-sm text-muted-foreground">Estimates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <span className="text-green-500 font-bold">AI</span>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {estimates.filter((e) => e.used_ai).length}
                  </p>
                  <p className="text-sm text-muted-foreground">AI Estimates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <span className="text-blue-500 font-bold">$</span>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {submissions.length > 0
                      ? formatCurrency(
                          submissions.reduce((sum, s) => sum + s.your_budget, 0) /
                            submissions.length
                        )
                      : "$0"}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Budget</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Tables */}
        <Tabs defaultValue="submissions" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="submissions" className="gap-2">
              <Database className="h-4 w-4" />
              Submissions ({submissions.length})
            </TabsTrigger>
            <TabsTrigger value="estimates" className="gap-2">
              <Calculator className="h-4 w-4" />
              Estimates ({estimates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submissions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Project Submissions</CardTitle>
                {selectedSubmissions.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setBulkDeleteType("submission");
                      setBulkDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedSubmissions.size})
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : submissions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No submissions yet
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={selectedSubmissions.size === submissions.length && submissions.length > 0}
                              onCheckedChange={toggleAllSubmissions}
                            />
                          </TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Edited</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Skills</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map((sub) => (
                          <TableRow key={sub.id} data-state={selectedSubmissions.has(sub.id) ? "selected" : undefined}>
                            <TableCell>
                              <Checkbox
                                checked={selectedSubmissions.has(sub.id)}
                                onCheckedChange={() => toggleSubmission(sub.id)}
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(sub.created_at)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {sub.updated_at ? (
                                <span className="text-primary">{formatDate(sub.updated_at)}</span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{sub.client_type}</Badge>
                            </TableCell>
                            <TableCell>{sub.project_type}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-48">
                                {sub.skills.slice(0, 2).map((skill) => (
                                  <Badge key={skill} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {sub.skills.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{sub.skills.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              {formatCurrency(sub.your_budget)}
                            </TableCell>
                            <TableCell>{sub.project_location}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditTarget(sub);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setDeleteTarget({ type: "submission", id: sub.id });
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="estimates">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Estimate Requests</CardTitle>
                {selectedEstimates.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setBulkDeleteType("estimate");
                      setBulkDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedEstimates.size})
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : estimates.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No estimates yet
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={selectedEstimates.size === estimates.length && estimates.length > 0}
                              onCheckedChange={toggleAllEstimates}
                            />
                          </TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Expertise</TableHead>
                          <TableHead>Estimate Range</TableHead>
                          <TableHead>Sample Size</TableHead>
                          <TableHead>AI</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {estimates.map((est) => (
                          <TableRow key={est.id} data-state={selectedEstimates.has(est.id) ? "selected" : undefined}>
                            <TableCell>
                              <Checkbox
                                checked={selectedEstimates.has(est.id)}
                                onCheckedChange={() => toggleEstimate(est.id)}
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(est.created_at)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{est.client_type}</Badge>
                            </TableCell>
                            <TableCell>{est.project_type}</TableCell>
                            <TableCell>{est.expertise_level}</TableCell>
                            <TableCell className="font-mono whitespace-nowrap">
                              {formatCurrency(est.low_estimate)} - {formatCurrency(est.high_estimate)}
                            </TableCell>
                            <TableCell>{est.sample_size}</TableCell>
                            <TableCell>
                              {est.used_ai ? (
                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                  Yes
                                </Badge>
                              ) : (
                                <Badge variant="secondary">No</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setDeleteTarget({ type: "estimate", id: est.id });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this{" "}
              {deleteTarget?.type === "submission" ? "submission" : "estimate"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={(open) => {
        setBulkDeleteDialogOpen(open);
        if (!open) setBulkDeleteConfirmText("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {bulkDeleteType === "submission" ? selectedSubmissions.size : selectedEstimates.size} {bulkDeleteType === "submission" ? "submissions" : "estimates"}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">This action cannot be undone. All selected records will be permanently removed.</span>
              <span className="block font-medium text-foreground">Type <span className="font-mono text-destructive">DELETE</span> to confirm:</span>
              <Input
                value={bulkDeleteConfirmText}
                onChange={(e) => setBulkDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="font-mono"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleteConfirmText !== "DELETE"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Delete All Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      {editTarget && (
        <AdminEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          submission={editTarget}
          onSave={handleEditSave}
        />
      )}
    </Layout>
  );
};

export default Admin;
