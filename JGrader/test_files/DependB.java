public class DependB {
  public static void main(String[] args) {
    DependA da = new DependA(6, 12);
    System.out.println(da.result());
  }
}
